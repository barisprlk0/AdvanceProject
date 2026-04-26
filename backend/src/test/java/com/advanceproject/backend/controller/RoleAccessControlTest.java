package com.advanceproject.backend.controller;

import com.advanceproject.backend.dto.RegisterRequest;
import com.advanceproject.backend.entity.Order;
import com.advanceproject.backend.entity.Product;
import com.advanceproject.backend.entity.Review;
import com.advanceproject.backend.entity.Shipment;
import com.advanceproject.backend.entity.Store;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.security.JwtUtil;
import com.advanceproject.backend.service.OrderService;
import com.advanceproject.backend.service.ProductService;
import com.advanceproject.backend.service.ReviewService;
import com.advanceproject.backend.service.ShipmentService;
import com.advanceproject.backend.service.StoreService;
import com.advanceproject.backend.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RoleAccessControlTest {

    @Test
    void selfRegistrationCannotAssignAdminRole() {
        UserService userService = mock(UserService.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        AuthController controller = new AuthController(
                mock(AuthenticationManager.class),
                mock(UserDetailsService.class),
                mock(JwtUtil.class),
                userService,
                passwordEncoder
        );
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@example.com");
        request.setPassword("secret1");
        request.setRoleType("ADMIN");

        when(userService.getUserByEmail("new@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hash");

        assertThatThrownBy(() -> controller.register(request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void corporateCannotFetchProductOwnedByAnotherStoreOwner() {
        ProductService productService = mock(ProductService.class);
        UserService userService = mock(UserService.class);
        ProductController controller = new ProductController(productService, userService, mock(StoreService.class));
        User corporate = user(10, "CORPORATE");
        Product otherProduct = product(200, store(300, user(99, "CORPORATE")));

        when(userService.getUserByEmail("corp@example.com")).thenReturn(Optional.of(corporate));
        when(productService.getProductById(200)).thenReturn(Optional.of(otherProduct));

        assertThat(controller.getProductById(200, auth("corp@example.com")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void corporateCannotFetchStoreOwnedByAnotherUser() {
        StoreService storeService = mock(StoreService.class);
        UserService userService = mock(UserService.class);
        StoreController controller = new StoreController(storeService, userService);
        User corporate = user(10, "CORPORATE");

        when(userService.getUserByEmail("corp@example.com")).thenReturn(Optional.of(corporate));
        when(storeService.getStoreById(300)).thenReturn(Optional.of(store(300, user(99, "CORPORATE"))));

        assertThat(controller.getStoreById(300, auth("corp@example.com")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void corporateStoreUpdatePreservesExistingOwner() {
        StoreService storeService = mock(StoreService.class);
        UserService userService = mock(UserService.class);
        StoreController controller = new StoreController(storeService, userService);
        User corporate = user(10, "CORPORATE");
        Store existing = store(300, corporate);
        Store payload = store(300, user(99, "CORPORATE"));

        when(userService.getUserByEmail("corp@example.com")).thenReturn(Optional.of(corporate));
        when(storeService.getStoreById(300)).thenReturn(Optional.of(existing));
        when(storeService.updateStore(any(), any())).thenAnswer(invocation -> invocation.getArgument(1));

        controller.updateStore(300, payload, auth("corp@example.com"));

        ArgumentCaptor<Store> storeCaptor = ArgumentCaptor.forClass(Store.class);
        verify(storeService).updateStore(any(), storeCaptor.capture());
        assertThat(storeCaptor.getValue().getOwner().getId()).isEqualTo(10);
    }

    @Test
    void corporateOrderUpdateCannotMoveOrderOrChangeCustomerOrTotal() {
        OrderService orderService = mock(OrderService.class);
        UserService userService = mock(UserService.class);
        OrderController controller = new OrderController(orderService, userService, mock(ShipmentService.class));
        User corporate = user(10, "CORPORATE");
        User customer = user(20, "INDIVIDUAL");
        Store ownStore = store(300, corporate);
        Order existing = order(400, customer, ownStore, BigDecimal.valueOf(100));
        Order payload = order(400, user(99, "INDIVIDUAL"), store(301, user(88, "CORPORATE")), BigDecimal.valueOf(999));

        when(userService.getUserByEmail("corp@example.com")).thenReturn(Optional.of(corporate));
        when(orderService.getOrderById(400)).thenReturn(Optional.of(existing));
        when(orderService.updateOrder(any(), any())).thenAnswer(invocation -> invocation.getArgument(1));

        controller.updateOrder(400, payload, auth("corp@example.com"));

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderService).updateOrder(any(), orderCaptor.capture());
        assertThat(orderCaptor.getValue().getUser().getId()).isEqualTo(20);
        assertThat(orderCaptor.getValue().getStore().getId()).isEqualTo(300);
        assertThat(orderCaptor.getValue().getGrandTotal()).isEqualByComparingTo("100");
    }

    @Test
    void corporateShipmentPatchCannotReassignShipmentToAnotherOrder() {
        ShipmentService shipmentService = mock(ShipmentService.class);
        UserService userService = mock(UserService.class);
        ShipmentController controller = new ShipmentController(shipmentService, userService, mock(OrderService.class));
        User corporate = user(10, "CORPORATE");
        Shipment existing = shipment(500, order(400, user(20, "INDIVIDUAL"), store(300, corporate), BigDecimal.TEN));
        Shipment payload = shipment(null, order(401, user(21, "INDIVIDUAL"), store(301, user(99, "CORPORATE")), BigDecimal.ONE));

        when(userService.getUserByEmail("corp@example.com")).thenReturn(Optional.of(corporate));
        when(shipmentService.getShipmentById(500)).thenReturn(Optional.of(existing));
        when(shipmentService.patchShipment(any(), any())).thenAnswer(invocation -> invocation.getArgument(1));

        controller.patchShipment(500, payload, auth("corp@example.com"));

        ArgumentCaptor<Shipment> shipmentCaptor = ArgumentCaptor.forClass(Shipment.class);
        verify(shipmentService).patchShipment(any(), shipmentCaptor.capture());
        assertThat(shipmentCaptor.getValue().getOrder()).isNull();
    }

    @Test
    void individualReviewPatchCannotChangeReviewOwnerOrProduct() {
        ReviewService reviewService = mock(ReviewService.class);
        UserService userService = mock(UserService.class);
        ReviewController controller = new ReviewController(reviewService, userService, mock(ProductService.class));
        User reviewer = user(20, "INDIVIDUAL");
        Review existing = review(600, reviewer, product(200, store(300, user(10, "CORPORATE"))));
        Review payload = review(null, user(99, "INDIVIDUAL"), product(201, store(301, user(88, "CORPORATE"))));

        when(userService.getUserByEmail("buyer@example.com")).thenReturn(Optional.of(reviewer));
        when(reviewService.getReviewById(600)).thenReturn(Optional.of(existing));
        when(reviewService.patchReview(any(), any())).thenAnswer(invocation -> invocation.getArgument(1));

        controller.patchReview(600, payload, auth("buyer@example.com"));

        ArgumentCaptor<Review> reviewCaptor = ArgumentCaptor.forClass(Review.class);
        verify(reviewService).patchReview(any(), reviewCaptor.capture());
        assertThat(reviewCaptor.getValue().getUser()).isNull();
        assertThat(reviewCaptor.getValue().getProduct()).isNull();
    }

    private Authentication auth(String email) {
        return new UsernamePasswordAuthenticationToken(email, "n/a");
    }

    private User user(Integer id, String roleType) {
        User user = new User();
        user.setId(id);
        user.setEmail("user" + id + "@example.com");
        user.setRoleType(roleType);
        return user;
    }

    private Store store(Integer id, User owner) {
        Store store = new Store();
        store.setId(id);
        store.setOwner(owner);
        return store;
    }

    private Product product(Integer id, Store store) {
        Product product = new Product();
        product.setId(id);
        product.setStore(store);
        return product;
    }

    private Order order(Integer id, User user, Store store, BigDecimal grandTotal) {
        Order order = new Order();
        order.setId(id);
        order.setUser(user);
        order.setStore(store);
        order.setGrandTotal(grandTotal);
        return order;
    }

    private Shipment shipment(Integer id, Order order) {
        Shipment shipment = new Shipment();
        shipment.setId(id);
        shipment.setOrder(order);
        return shipment;
    }

    private Review review(Integer id, User user, Product product) {
        Review review = new Review();
        review.setId(id);
        review.setUser(user);
        review.setProduct(product);
        return review;
    }
}
