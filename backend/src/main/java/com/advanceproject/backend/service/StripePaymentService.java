package com.advanceproject.backend.service;

import com.advanceproject.backend.dto.OrderRequest;
import com.advanceproject.backend.dto.StripeCheckoutRequest;
import com.advanceproject.backend.dto.StripeCheckoutResponse;
import com.advanceproject.backend.dto.StripeCompleteRequest;
import com.advanceproject.backend.dto.StripeCompleteResponse;
import com.advanceproject.backend.entity.Order;
import com.advanceproject.backend.entity.Product;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.repository.ProductRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class StripePaymentService {

    private final ProductRepository productRepository;
    private final OrderService orderService;
    private final Set<String> completedSessions = ConcurrentHashMap.newKeySet();
    private final Map<String, List<OrderRequest>> pendingOrdersBySession = new ConcurrentHashMap<>();

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.currency:try}")
    private String stripeCurrency;

    @Value("${stripe.success-url}")
    private String stripeSuccessUrl;

    @Value("${stripe.cancel-url}")
    private String stripeCancelUrl;

    public StripePaymentService(ProductRepository productRepository, OrderService orderService) {
        this.productRepository = productRepository;
        this.orderService = orderService;
    }

    @Transactional(readOnly = true)
    public StripeCheckoutResponse createCheckoutSession(User user, StripeCheckoutRequest request) throws StripeException {
        ensureStripeConfigured();
        List<OrderRequest> normalizedOrders = normalizeOrdersByProductStore(request.getOrders());
        CheckoutCalculation calculation = calculateOrderTotal(normalizedOrders, true);

        SessionCreateParams.Builder params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(stripeSuccessUrl)
                .setCancelUrl(stripeCancelUrl)
                .setClientReferenceId(user.getId().toString())
                .putMetadata("userId", user.getId().toString());

        calculation.lineItems().forEach(params::addLineItem);

        Stripe.apiKey = stripeSecretKey;
        Session session = Session.create(params.build());
        pendingOrdersBySession.put(session.getId(), copyOrders(normalizedOrders));
        return new StripeCheckoutResponse(session.getId(), session.getUrl());
    }

    @Transactional
    public StripeCompleteResponse completeCheckout(User user, StripeCompleteRequest request) throws StripeException {
        ensureStripeConfigured();
        if (request.getSessionId() == null || request.getSessionId().isBlank()) {
            throw new IllegalArgumentException("Stripe session id is required.");
        }
        if (!completedSessions.add(request.getSessionId())) {
            throw new IllegalStateException("This Stripe payment session was already completed.");
        }

        try {
            Stripe.apiKey = stripeSecretKey;
            Session session = Session.retrieve(request.getSessionId());

            if (session.getClientReferenceId() != null
                    && !session.getClientReferenceId().equals(user.getId().toString())) {
                throw new IllegalStateException("Stripe session does not belong to the current user.");
            }
            if (!"paid".equalsIgnoreCase(session.getPaymentStatus())) {
                throw new IllegalStateException("Stripe payment has not been completed.");
            }

            List<OrderRequest> pendingOrders = pendingOrdersBySession.get(request.getSessionId());
            if (pendingOrders == null || pendingOrders.isEmpty()) {
                throw new IllegalStateException("No pending order was found for this Stripe payment session.");
            }

            CheckoutCalculation calculation = calculateOrderTotal(pendingOrders, false);
            if (session.getAmountTotal() == null || session.getAmountTotal() != calculation.totalAmount()) {
                throw new IllegalStateException("Stripe paid amount does not match the current order total.");
            }

            List<Order> createdOrders = new ArrayList<>();
            for (OrderRequest orderRequest : pendingOrders) {
                orderRequest.setPaymentMethod("Stripe");
                createdOrders.add(orderService.createOrder(user, orderRequest));
            }
            pendingOrdersBySession.remove(request.getSessionId());
            return new StripeCompleteResponse(createdOrders);
        } catch (RuntimeException | StripeException ex) {
            completedSessions.remove(request.getSessionId());
            throw ex;
        }
    }

    private CheckoutCalculation calculateOrderTotal(List<OrderRequest> orders, boolean includeLineItems) {
        if (orders == null || orders.isEmpty()) {
            throw new IllegalArgumentException("At least one order is required.");
        }

        List<SessionCreateParams.LineItem> lineItems = new ArrayList<>();
        long totalAmount = 0L;

        for (OrderRequest order : orders) {
            if (order.getStoreId() == null) {
                throw new IllegalArgumentException("Store id is required.");
            }
            if (order.getItems() == null || order.getItems().isEmpty()) {
                throw new IllegalArgumentException("Order items are required.");
            }

            for (OrderRequest.OrderItemRequest item : order.getItems()) {
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new IllegalArgumentException("Product not found: " + item.getProductId()));
                validateProductForOrder(order, item, product);

                long quantity = item.getQuantity().longValue();
                long unitAmount = toStripeAmount(product.getUnitPrice());
                totalAmount = Math.addExact(totalAmount, Math.multiplyExact(unitAmount, quantity));

                if (includeLineItems) {
                    lineItems.add(buildLineItem(product, quantity, unitAmount));
                }
            }
        }

        if (includeLineItems && lineItems.size() > 100) {
            throw new IllegalArgumentException("Stripe Checkout supports up to 100 line items.");
        }
        return new CheckoutCalculation(lineItems, totalAmount);
    }

    private List<OrderRequest> normalizeOrdersByProductStore(List<OrderRequest> orders) {
        if (orders == null || orders.isEmpty()) {
            throw new IllegalArgumentException("At least one order is required.");
        }

        Map<Integer, OrderRequest> grouped = new LinkedHashMap<>();
        for (OrderRequest order : orders) {
            if (order.getItems() == null || order.getItems().isEmpty()) {
                throw new IllegalArgumentException("Order items are required.");
            }

            for (OrderRequest.OrderItemRequest item : order.getItems()) {
                if (item.getProductId() == null) {
                    throw new IllegalArgumentException("Product id is required.");
                }
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new IllegalArgumentException("Product not found: " + item.getProductId()));
                if (product.getStore() == null || product.getStore().getId() == null) {
                    throw new IllegalArgumentException("Product has no store: " + product.getId());
                }

                Integer actualStoreId = product.getStore().getId();
                OrderRequest groupedOrder = grouped.computeIfAbsent(actualStoreId, storeId -> {
                    OrderRequest next = new OrderRequest();
                    next.setStoreId(storeId);
                    next.setPaymentMethod("Stripe");
                    next.setItems(new ArrayList<>());
                    return next;
                });

                OrderRequest.OrderItemRequest itemCopy = new OrderRequest.OrderItemRequest();
                itemCopy.setProductId(item.getProductId());
                itemCopy.setQuantity(item.getQuantity());
                groupedOrder.getItems().add(itemCopy);
            }
        }

        return new ArrayList<>(grouped.values());
    }

    private void validateProductForOrder(OrderRequest order, OrderRequest.OrderItemRequest item, Product product) {
        if (item.getQuantity() == null || item.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero.");
        }
        if (product.getUnitPrice() == null || product.getUnitPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Product price must be greater than zero: " + product.getId());
        }
        if (product.getStore() == null || !order.getStoreId().equals(product.getStore().getId())) {
            throw new IllegalArgumentException("Product does not belong to the selected store: " + product.getId());
        }
        if (product.getStockQuantity() != null && product.getStockQuantity() < item.getQuantity()) {
            throw new IllegalArgumentException("Insufficient stock for product: " + product.getName());
        }
    }

    private SessionCreateParams.LineItem buildLineItem(Product product, long quantity, long unitAmount) {
        SessionCreateParams.LineItem.PriceData.ProductData productData =
                SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName(product.getName() == null || product.getName().isBlank()
                                ? "Product #" + product.getId()
                                : product.getName())
                        .build();

        SessionCreateParams.LineItem.PriceData priceData =
                SessionCreateParams.LineItem.PriceData.builder()
                        .setCurrency(stripeCurrency.toLowerCase())
                        .setUnitAmount(unitAmount)
                        .setProductData(productData)
                        .build();

        return SessionCreateParams.LineItem.builder()
                .setQuantity(quantity)
                .setPriceData(priceData)
                .build();
    }

    private long toStripeAmount(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    private void ensureStripeConfigured() {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new IllegalStateException("STRIPE_SECRET_KEY is not configured.");
        }
    }

    private List<OrderRequest> copyOrders(List<OrderRequest> orders) {
        List<OrderRequest> copies = new ArrayList<>();
        for (OrderRequest order : orders) {
            OrderRequest copy = new OrderRequest();
            copy.setStoreId(order.getStoreId());
            copy.setPaymentMethod(order.getPaymentMethod());
            List<OrderRequest.OrderItemRequest> itemCopies = new ArrayList<>();
            for (OrderRequest.OrderItemRequest item : order.getItems()) {
                OrderRequest.OrderItemRequest itemCopy = new OrderRequest.OrderItemRequest();
                itemCopy.setProductId(item.getProductId());
                itemCopy.setQuantity(item.getQuantity());
                itemCopies.add(itemCopy);
            }
            copy.setItems(itemCopies);
            copies.add(copy);
        }
        return copies;
    }

    private record CheckoutCalculation(List<SessionCreateParams.LineItem> lineItems, long totalAmount) {
    }
}
