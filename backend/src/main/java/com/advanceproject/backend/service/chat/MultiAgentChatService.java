package com.advanceproject.backend.service.chat;

import com.advanceproject.backend.dto.ChatAskRequest;
import com.advanceproject.backend.dto.ChatAskResponse;
import com.advanceproject.backend.dto.ChatChartData;
import com.advanceproject.backend.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class MultiAgentChatService {
    private static final Pattern BLOCKED_KEYWORDS = Pattern.compile(
            "\\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|merge|execute|call)\\b",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern RAW_TABLE_REFERENCE = Pattern.compile(
            "\\b(from|join)\\s+(?:public\\.)?(orders|order_items|products|reviews|shipments|categories|users|stores|customer_profiles)\\b",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern LIMIT_PATTERN = Pattern.compile("\\blimit\\b", Pattern.CASE_INSENSITIVE);
    private static final Set<String> ID_LIKE_COLUMNS = Set.of(
            "id", "user_id", "store_id", "order_id", "product_id", "category_id", "parent_id"
    );
    private static final List<String> LABEL_COLUMN_PRIORITY = List.of(
            "category", "product", "customer", "period", "month", "date", "rating", "status",
            "mode", "membership_type", "city", "sentiment", "warehouse"
    );
    private static final List<String> VALUE_COLUMN_PRIORITY = List.of(
            "revenue", "total_revenue", "grand_total", "sales", "count", "order_count",
            "cancelled_count", "cancellation_rate", "avg_rating", "average_rating",
            "shipped_by_air", "quantity", "stock_quantity", "total"
    );

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final OpenAiChatClient openAiChatClient;
    private final int maxRows;
    private final int maxRetries;

    public MultiAgentChatService(
            NamedParameterJdbcTemplate jdbcTemplate,
            OpenAiChatClient openAiChatClient,
            @Value("${ai.chat.max-rows:200}") int maxRows,
            @Value("${ai.chat.max-retries:3}") int maxRetries
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.openAiChatClient = openAiChatClient;
        this.maxRows = Math.max(20, maxRows);
        this.maxRetries = Math.max(1, maxRetries);
    }

    public ChatAskResponse ask(ChatAskRequest request, User user) {
        ChatState state = new ChatState();
        state.setQuestion(request.getQuestion().trim());
        state.setRoleType(normalizeRole(user.getRoleType()));
        state.setUserId(user.getId());

        guardrailsAgent(state);
        if (!state.isInScope() || state.isGreeting()) {
            return toResponse(state);
        }

        sqlAgent(state);

        for (int i = 0; i < maxRetries; i++) {
            state.setIterationCount(i);
            try {
                validateGeneratedSql(state.getSqlQuery());
                state.setQueryResult(executeScopedQuery(state));
                state.setError(null);
                break;
            } catch (Exception ex) {
                state.setError(ex.getMessage());
                if (i == maxRetries - 1) {
                    break;
                }
                errorRecoveryAgent(state);
            }
        }

        analysisAgent(state);
        visualizationAgent(state);
        return toResponse(state);
    }

    private void guardrailsAgent(ChatState state) {
        String q = state.getQuestion().toLowerCase(Locale.ROOT);
        if (q.matches("^(hi|hello|hey|selam|merhaba|good morning|good evening)[!.\\s]*$")) {
            state.setGreeting(true);
            state.setFinalAnswer("Hello. Ask me about your e-commerce data and I will generate SQL and insights.");
            return;
        }

        boolean mutationIntent = q.matches(".*\\b(delete|remove|drop|truncate|update|insert|create|alter|modify|sil|kaldir|guncelle|ekle)\\b.*");
        if (mutationIntent) {
            state.setInScope(false);
            state.setRejectionReason("Unsafe operation");
            state.setFinalAnswer("This assistant is read-only. It cannot delete, update, or modify data. Ask for analytics or reporting queries instead.");
            return;
        }

        boolean hasDomainKeyword = q.matches(".*\\b(order|orders|product|products|review|reviews|shipment|shipments|customer|customers|store|stores|sales|revenue|category|categories|rating|analytics|kargo|siparis|urun|satis|musteri)\\b.*");
        boolean hasAnalyticsVerb = q.matches(".*\\b(top|trend|count|average|avg|sum|compare|distribution|breakdown|how many|what is|show|list|find|highest|lowest|ratio|rate)\\b.*");

        if (!hasDomainKeyword && !hasAnalyticsVerb) {
            state.setInScope(false);
            state.setRejectionReason("Out of scope");
            state.setFinalAnswer("This assistant only handles e-commerce analytics questions. Please ask about orders, sales, products, customers, reviews, or shipments.");
        }
    }

    private void sqlAgent(ChatState state) {
        String generated = generateSqlWithRules(state.getQuestion());
        if (generated == null || generated.isBlank()) {
            generated = generateSqlWithLlm(state);
        }
        if (generated == null || generated.isBlank()) {
            generated = recentOrdersSql();
        }
        state.setSqlQuery(cleanSql(generated));
    }

    private void errorRecoveryAgent(ChatState state) {
        String fixedByLlm = fixSqlWithLlm(state);
        if (fixedByLlm != null && !fixedByLlm.isBlank()) {
            state.setSqlQuery(cleanSql(fixedByLlm));
            return;
        }

        String sql = state.getSqlQuery();
        sql = sql.replaceAll("(?i)\\borders\\b", "scoped_orders")
                .replaceAll("(?i)\\border_items\\b", "scoped_order_items")
                .replaceAll("(?i)\\bproducts\\b", "scoped_products")
                .replaceAll("(?i)\\breviews\\b", "scoped_reviews")
                .replaceAll("(?i)\\bshipments\\b", "scoped_shipments")
                .replaceAll("(?i)\\bcategories\\b", "scoped_categories")
                .replaceAll("(?i)\\busers\\b", "scoped_users")
                .replaceAll("(?i)\\bstores\\b", "scoped_stores")
                .replaceAll("(?i)\\bcustomer_profiles\\b", "scoped_customer_profiles");
        state.setSqlQuery(cleanSql(sql));
    }

    private void analysisAgent(ChatState state) {
        if (state.getError() != null && !state.getError().isBlank()) {
            state.setFinalAnswer("I could not complete the query safely after retries. " + summarizeError(state.getError()));
            return;
        }

        List<Map<String, Object>> rows = state.getQueryResult();
        if (rows == null || rows.isEmpty()) {
            state.setFinalAnswer("No data matched this question in your role scope.");
            return;
        }

        if (isDetailListResult(state, rows.get(0))) {
            String preview = rows.stream()
                    .limit(5)
                    .map(this::rowToInlineText)
                    .collect(Collectors.joining("\n"));
            state.setFinalAnswer("Found " + rows.size() + " matching rows in your role scope. Top rows:\n" + preview);
            return;
        }

        String llmAnswer = explainWithLlm(state, rows);
        if (llmAnswer != null && !llmAnswer.isBlank()) {
            state.setFinalAnswer(llmAnswer);
            return;
        }

        Map<String, Object> first = rows.get(0);
        if (rows.size() == 1 && first.size() == 1) {
            Map.Entry<String, Object> metric = first.entrySet().iterator().next();
            state.setFinalAnswer("Result: " + metric.getKey() + " = " + metric.getValue());
            return;
        }

        String preview = rows.stream()
                .limit(5)
                .map(this::rowToInlineText)
                .collect(Collectors.joining("\n"));
        state.setFinalAnswer("Query completed successfully. Top rows:\n" + preview);
    }

    private void visualizationAgent(ChatState state) {
        List<Map<String, Object>> rows = state.getQueryResult();
        if (rows == null || rows.size() < 2) {
            return;
        }
        if (isDetailListResult(state, rows.get(0))) {
            return;
        }

        String valueColumn = findNumericColumn(rows.get(0));
        String labelColumn = findLabelColumn(rows.get(0), valueColumn);
        if (labelColumn == null || valueColumn == null) {
            return;
        }

        List<String> labels = new ArrayList<>();
        List<Double> values = new ArrayList<>();
        for (Map<String, Object> row : rows.stream().limit(12).toList()) {
            Object label = row.get(labelColumn);
            Object value = row.get(valueColumn);
            if (label == null || !(value instanceof Number number)) {
                continue;
            }
            labels.add(label.toString());
            values.add(number.doubleValue());
        }

        if (labels.size() < 2) {
            return;
        }

        String chartType = looksLikeTrendQuestion(state.getQuestion()) ? "line" : "bar";
        state.setChart(ChatChartData.builder()
                .type(chartType)
                .title("Auto chart: " + valueColumn + " by " + labelColumn)
                .xLabel(labelColumn)
                .yLabel(valueColumn)
                .labels(labels)
                .values(values)
                .visualizationCode(buildPlotlyCode(chartType, labelColumn, valueColumn, labels, values))
                .build());
    }

    private ChatAskResponse toResponse(ChatState state) {
        return ChatAskResponse.builder()
                .inScope(state.isInScope())
                .greeting(state.isGreeting())
                .roleScope(state.getRoleType())
                .finalAnswer(state.getFinalAnswer())
                .sqlQuery(state.getSqlQuery())
                .rejectionReason(state.getRejectionReason())
                .retryCount(state.getIterationCount())
                .rows(state.getQueryResult())
                .chart(state.getChart())
                .build();
    }

    private List<Map<String, Object>> executeScopedQuery(ChatState state) {
        String finalSql = combineScopeWithGeneratedSql(buildScopeCteSql(state.getRoleType()), enforceLimit(state.getSqlQuery()));
        MapSqlParameterSource params = new MapSqlParameterSource("userId", state.getUserId());

        List<Map<String, Object>> list = jdbcTemplate.queryForList(finalSql, params);
        return list.stream().map(m -> {
            Map<String, Object> lower = new LinkedHashMap<>();
            m.forEach((k, v) -> lower.put(k.toLowerCase(Locale.ROOT), v));
            return lower;
        }).toList();
    }

    private String combineScopeWithGeneratedSql(String scopeSql, String generatedSql) {
        String trimmed = generatedSql.trim();
        if (trimmed.regionMatches(true, 0, "WITH ", 0, 5)) {
            return scopeSql + ",\n" + trimmed.substring(5).trim();
        }
        return scopeSql + "\n" + trimmed;
    }

    private String buildScopeCteSql(String roleType) {
        if ("ADMIN".equals(roleType)) {
            return """
                    WITH scoped_stores AS (
                        SELECT * FROM stores
                    ),
                    scoped_orders AS (
                        SELECT * FROM orders
                    ),
                    scoped_order_items AS (
                        SELECT * FROM order_items
                    ),
                    scoped_products AS (
                        SELECT * FROM products
                    ),
                    scoped_reviews AS (
                        SELECT * FROM reviews
                    ),
                    scoped_shipments AS (
                        SELECT * FROM shipments
                    ),
                    scoped_users AS (
                        SELECT id, email, role_type, gender FROM users
                    ),
                    scoped_customer_profiles AS (
                        SELECT * FROM customer_profiles
                    ),
                    scoped_categories AS (
                        SELECT * FROM categories
                    )
                    """;
        }

        if ("CORPORATE".equals(roleType)) {
            return """
                    WITH scoped_stores AS (
                        SELECT * FROM stores WHERE owner_id = :userId
                    ),
                    scoped_orders AS (
                        SELECT o.* FROM orders o
                        JOIN scoped_stores s ON s.id = o.store_id
                    ),
                    scoped_order_items AS (
                        SELECT oi.* FROM order_items oi
                        JOIN scoped_orders so ON so.id = oi.order_id
                    ),
                    scoped_products AS (
                        SELECT p.* FROM products p
                        JOIN scoped_stores s ON s.id = p.store_id
                    ),
                    scoped_reviews AS (
                        SELECT r.* FROM reviews r
                        JOIN scoped_products p ON p.id = r.product_id
                    ),
                    scoped_shipments AS (
                        SELECT sh.* FROM shipments sh
                        JOIN scoped_orders so ON so.id = sh.order_id
                    ),
                    scoped_users AS (
                        SELECT DISTINCT u.id, u.email, u.role_type, u.gender
                        FROM users u
                        JOIN scoped_orders so ON so.user_id = u.id
                    ),
                    scoped_customer_profiles AS (
                        SELECT cp.* FROM customer_profiles cp
                        JOIN scoped_users su ON su.id = cp.user_id
                    ),
                    scoped_categories AS (
                        SELECT DISTINCT c.* FROM categories c
                        JOIN scoped_products p ON p.category_id = c.id
                    )
                    """;
        }

        return """
                WITH scoped_orders AS (
                    SELECT * FROM orders WHERE user_id = :userId
                ),
                scoped_order_items AS (
                    SELECT oi.* FROM order_items oi
                    JOIN scoped_orders so ON so.id = oi.order_id
                ),
                scoped_products AS (
                    SELECT DISTINCT p.* FROM products p
                    JOIN scoped_order_items soi ON soi.product_id = p.id
                ),
                scoped_reviews AS (
                    SELECT * FROM reviews WHERE user_id = :userId
                ),
                scoped_shipments AS (
                    SELECT sh.* FROM shipments sh
                    JOIN scoped_orders so ON so.id = sh.order_id
                ),
                scoped_stores AS (
                    SELECT DISTINCT s.* FROM stores s
                    JOIN scoped_orders so ON so.store_id = s.id
                ),
                scoped_users AS (
                    SELECT id, email, role_type, gender FROM users WHERE id = :userId
                ),
                scoped_customer_profiles AS (
                    SELECT * FROM customer_profiles WHERE user_id = :userId
                ),
                scoped_categories AS (
                    SELECT DISTINCT c.* FROM categories c
                    JOIN scoped_products sp ON sp.category_id = c.id
                )
                """;
    }

    private String generateSqlWithLlm(ChatState state) {
        if (!openAiChatClient.isEnabled()) {
            return null;
        }

        String systemPrompt = """
                You are the SQL Agent in a multi-agent Text2SQL architecture.
                Return only one PostgreSQL SELECT query with no markdown and no explanation.
                Use only these scoped tables:
                scoped_orders(id, user_id, store_id, status, order_date, payment_method, grand_total)
                scoped_order_items(id, order_id, product_id, quantity, price)
                scoped_products(id, store_id, category_id, sku, name, description, unit_price, stock_quantity)
                scoped_reviews(id, user_id, product_id, star_rating, helpfulness_votes, sentiment)
                scoped_shipments(id, order_id, warehouse, mode, status)
                scoped_categories(id, name, parent_id)
                scoped_stores(id, owner_id, name, status)
                scoped_users(id, email, role_type, gender)
                scoped_customer_profiles(id, user_id, age, city, membership_type, total_spend, items_purchased, avg_rating, satisfaction_level)
                Safety rules:
                - SELECT only
                - no write operations
                - no semicolon
                - include LIMIT for list outputs
                - prefer grouped metrics over raw rows for analysis questions
                - for relative dates, prefer the latest available order_date in scoped_orders when the role scope has historical demo data
                - if you use CTEs, start with WITH and keep them compatible with existing scoped_* CTEs
                """;

        String userPrompt = "Role scope: " + state.getRoleType() + ". User question: " + state.getQuestion();
        return openAiChatClient.complete(systemPrompt, userPrompt);
    }

    private String fixSqlWithLlm(ChatState state) {
        if (!openAiChatClient.isEnabled()) {
            return null;
        }

        String systemPrompt = """
                You are the Error Recovery Agent.
                Fix the SQL query for PostgreSQL.
                Return only corrected SQL, no markdown, no comments, no semicolon.
                Query must use scoped_* tables only.
                """;

        String userPrompt = """
                Question: %s
                SQL:
                %s
                Error:
                %s
                """.formatted(state.getQuestion(), state.getSqlQuery(), state.getError());

        return openAiChatClient.complete(systemPrompt, userPrompt);
    }

    private String explainWithLlm(ChatState state, List<Map<String, Object>> rows) {
        if (!openAiChatClient.isEnabled()) {
            return null;
        }

        String systemPrompt = """
                You are the Analysis Agent.
                Explain SQL query results in plain, concise business language.
                Mention one key takeaway.
                """;

        String sampleRows = rows.stream().limit(10).map(this::rowToInlineText).collect(Collectors.joining("\n"));
        String userPrompt = """
                Question: %s
                SQL: %s
                Rows:
                %s
                """.formatted(state.getQuestion(), state.getSqlQuery(), sampleRows);

        return openAiChatClient.complete(systemPrompt, userPrompt);
    }

    private String generateSqlWithRules(String question) {
        String q = question.toLowerCase(Locale.ROOT);

        if ((q.contains("pending") || q.contains("bekleyen")) && (q.contains("order") || q.contains("siparis"))) {
            return """
                    SELECT id, status, order_date, grand_total
                    FROM scoped_orders
                    WHERE LOWER(COALESCE(status, '')) LIKE '%pending%'
                    ORDER BY order_date DESC NULLS LAST
                    LIMIT 20
                    """;
        }

        if ((q.contains("order status") || q.contains("status breakdown") || q.contains("siparis durumu"))
                && (q.contains("breakdown") || q.contains("distribution") || q.contains("dagilim") || q.contains("show"))) {
            return """
                    SELECT status, COUNT(*) AS order_count
                    FROM scoped_orders
                    GROUP BY status
                    ORDER BY order_count DESC
                    LIMIT 20
                    """;
        }

        if (q.contains("sales by category") || q.contains("category sales") || (q.contains("kategori") && q.contains("satis"))) {
            return """
                    SELECT c.name AS category, COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue
                    FROM scoped_order_items oi
                    JOIN scoped_orders o ON o.id = oi.order_id
                    JOIN scoped_products p ON p.id = oi.product_id
                    LEFT JOIN scoped_categories c ON c.id = p.category_id
                    WHERE DATE_TRUNC('month', o.order_date)::date = COALESCE(
                        (
                            SELECT month_key
                            FROM (
                                SELECT DATE_TRUNC('month', o2.order_date)::date AS month_key
                                FROM scoped_orders o2
                                JOIN scoped_order_items oi2 ON oi2.order_id = o2.id
                                WHERE o2.order_date IS NOT NULL
                                GROUP BY 1
                                ORDER BY month_key DESC
                                OFFSET 1
                                LIMIT 1
                            ) t
                        ),
                        (
                            SELECT DATE_TRUNC('month', MAX(o3.order_date))::date
                            FROM scoped_orders o3
                            JOIN scoped_order_items oi3 ON oi3.order_id = o3.id
                            WHERE o3.order_date IS NOT NULL
                        )
                    )
                    GROUP BY c.name
                    ORDER BY revenue DESC
                    LIMIT 20
                    """;
        }

        if ((q.contains("weekly") || q.contains("week") || q.contains("hafta")) && (q.contains("revenue") || q.contains("sales") || q.contains("ciro") || q.contains("gelir"))) {
            return """
                    SELECT DATE(o.order_date)::date AS date, COALESCE(SUM(o.grand_total), 0) AS revenue
                    FROM scoped_orders o
                    WHERE o.order_date >= (
                        SELECT MAX(o2.order_date)::date - INTERVAL '6 days'
                        FROM scoped_orders o2
                        WHERE o2.order_date IS NOT NULL
                    )
                    GROUP BY DATE(o.order_date)
                    ORDER BY date
                    LIMIT 7
                    """;
        }

        if (asksForMostSoldProducts(q)) {
            return """
                    SELECT p.name AS product,
                           COALESCE(SUM(oi.quantity), 0) AS quantity_sold,
                           COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue
                    FROM scoped_products p
                    JOIN scoped_order_items oi ON oi.product_id = p.id
                    GROUP BY p.name
                    ORDER BY quantity_sold DESC, revenue DESC
                    LIMIT 10
                    """;
        }

        if ((q.contains("top") || q.contains("best") || q.contains("perform")) && q.contains("product")) {
            return """
                    SELECT p.name AS product,
                           COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue,
                           COALESCE(SUM(oi.quantity), 0) AS quantity
                    FROM scoped_order_items oi
                    JOIN scoped_products p ON p.id = oi.product_id
                    GROUP BY p.name
                    ORDER BY revenue DESC
                    LIMIT 5
                    """;
        }

        if ((q.contains("top 5") || q.contains("top five")) && q.contains("customer")) {
            return """
                    SELECT su.email AS customer, COALESCE(SUM(o.grand_total), 0) AS revenue
                    FROM scoped_orders o
                    JOIN scoped_users su ON su.id = o.user_id
                    GROUP BY su.email
                    ORDER BY revenue DESC
                    LIMIT 5
                    """;
        }

        if (q.contains("compare") && q.contains("this month")) {
            return """
                    SELECT period, revenue
                    FROM (
                        SELECT 'latest_month' AS period, COALESCE(SUM(o.grand_total), 0) AS revenue
                        FROM scoped_orders o
                        WHERE DATE_TRUNC('month', o.order_date)::date = (
                            SELECT DATE_TRUNC('month', MAX(o2.order_date))::date
                            FROM scoped_orders o2
                            WHERE o2.order_date IS NOT NULL
                        )
                        UNION ALL
                        SELECT 'previous_data_month' AS period, COALESCE(SUM(o.grand_total), 0) AS revenue
                        FROM scoped_orders o
                        WHERE DATE_TRUNC('month', o.order_date)::date = COALESCE(
                            (
                                SELECT month_key
                                FROM (
                                    SELECT DATE_TRUNC('month', o3.order_date)::date AS month_key
                                    FROM scoped_orders o3
                                    WHERE o3.order_date IS NOT NULL
                                    GROUP BY 1
                                    ORDER BY month_key DESC
                                    OFFSET 1
                                    LIMIT 1
                                ) t
                            ),
                            (
                                SELECT DATE_TRUNC('month', MAX(o4.order_date))::date
                                FROM scoped_orders o4
                                WHERE o4.order_date IS NOT NULL
                            )
                        )
                    ) x
                    """;
        }

        if ((q.contains("lowest") || q.contains("en dusuk")) && (q.contains("rating") || q.contains("puan"))) {
            return """
                    SELECT p.name AS product, ROUND(AVG(r.star_rating)::numeric, 2) AS avg_rating
                    FROM scoped_reviews r
                    JOIN scoped_products p ON p.id = r.product_id
                    GROUP BY p.name
                    ORDER BY avg_rating ASC
                    LIMIT 10
                    """;
        }

        if ((q.contains("trend") || q.contains("trendi")) && (q.contains("cancel") || q.contains("iptal"))) {
            return """
                    SELECT DATE_TRUNC('month', order_date)::date AS month,
                           COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) LIKE '%cancel%') AS cancelled_count
                    FROM scoped_orders
                    WHERE order_date IS NOT NULL
                    GROUP BY DATE_TRUNC('month', order_date)
                    ORDER BY month
                    LIMIT 24
                    """;
        }

        if (q.contains("shipped by air") || (q.contains("air") && q.contains("ship"))) {
            return """
                    SELECT COUNT(*) AS shipped_by_air
                    FROM scoped_shipments
                    WHERE LOWER(COALESCE(mode, '')) LIKE '%air%'
                    """;
        }

        if (q.contains("rating distribution") || q.contains("puan dagilimi")) {
            return """
                    SELECT star_rating AS rating, COUNT(*) AS count
                    FROM scoped_reviews
                    GROUP BY star_rating
                    ORDER BY star_rating
                    LIMIT 10
                    """;
        }

        if (q.contains("customer distribution") || q.contains("musteri dagilimi")) {
            return """
                    SELECT COALESCE(membership_type, 'Unknown') AS membership_type, COUNT(*) AS count
                    FROM scoped_customer_profiles
                    GROUP BY membership_type
                    ORDER BY count DESC
                    LIMIT 10
                    """;
        }

        if ((q.contains("low stock") || q.contains("stock alert") || q.contains("az stok")) && q.contains("product")) {
            return """
                    SELECT name AS product, stock_quantity
                    FROM scoped_products
                    WHERE stock_quantity IS NOT NULL
                    ORDER BY stock_quantity ASC
                    LIMIT 20
                    """;
        }

        if (q.contains("total") && (q.contains("sales") || q.contains("revenue") || q.contains("ciro") || q.contains("gelir"))) {
            return """
                    SELECT COALESCE(SUM(grand_total), 0) AS total_revenue
                    FROM scoped_orders
                    """;
        }

        if ((q.contains("list") || q.contains("show")) && (q.contains("order") || q.contains("siparis"))) {
            return recentOrdersSql();
        }

        return null;
    }

    private String recentOrdersSql() {
        return """
                SELECT id, status, order_date, grand_total
                FROM scoped_orders
                ORDER BY order_date DESC NULLS LAST
                LIMIT 20
                """;
    }

    private boolean asksForMostSoldProducts(String q) {
        boolean productTerm = q.contains("product") || q.contains("products") || q.contains("urun") || q.contains("urunler");
        boolean soldMostTerm = q.contains("sold the most")
                || q.contains("most sold")
                || q.contains("best selling")
                || q.contains("bestselling")
                || q.contains("top selling")
                || q.contains("sold most")
                || q.contains("most purchased")
                || q.contains("en cok satan")
                || q.contains("en cok satilan")
                || q.contains("en fazla satan")
                || q.contains("en fazla satilan");
        return productTerm && soldMostTerm;
    }

    private String normalizeRole(String roleType) {
        String value = roleType == null ? "" : roleType.trim().toUpperCase(Locale.ROOT);
        if ("ADMIN".equals(value) || "CORPORATE".equals(value)) {
            return value;
        }
        return "INDIVIDUAL";
    }

    private String rowToInlineText(Map<String, Object> row) {
        return row.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining(", "));
    }

    private boolean isDetailListResult(ChatState state, Map<String, Object> firstRow) {
        String q = state.getQuestion().toLowerCase(Locale.ROOT);
        String sql = state.getSqlQuery() == null ? "" : state.getSqlQuery().toLowerCase(Locale.ROOT);
        boolean asksForList = q.contains("list") || q.contains("show pending") || q.contains("pending orders") || q.contains("orders");
        boolean hasEntityId = firstRow.containsKey("id") || firstRow.containsKey("order_id") || firstRow.containsKey("product_id");
        boolean hasAggregate = firstRow.keySet().stream().anyMatch(column ->
                column.contains("count")
                        || column.contains("sum")
                        || column.contains("avg")
                        || column.contains("revenue")
                        || column.contains("rate")
        );
        return hasEntityId && asksForList && !hasAggregate && sql.contains("from scoped_");
    }

    private String summarizeError(String error) {
        String lower = error.toLowerCase(Locale.ROOT);
        if (lower.contains("bad sql grammar")) {
            return "The generated SQL had a grammar issue, so it was blocked after recovery attempts.";
        }
        if (lower.contains("unsafe")) {
            return "The generated SQL was unsafe and was blocked.";
        }
        if (lower.contains("scoped")) {
            return "The generated SQL did not respect the role-scoped table rules.";
        }
        return "The generated SQL could not be executed safely.";
    }

    private void validateGeneratedSql(String sql) {
        if (sql == null || sql.isBlank()) {
            throw new IllegalArgumentException("SQL generation failed");
        }

        String normalized = sql.trim().toLowerCase(Locale.ROOT);
        if (!(normalized.startsWith("select") || normalized.startsWith("with"))) {
            throw new IllegalArgumentException("Only SELECT queries are allowed");
        }
        if (sql.contains(";")) {
            throw new IllegalArgumentException("Multi-statement SQL is blocked");
        }
        if (sql.contains("--") || sql.contains("/*")) {
            throw new IllegalArgumentException("SQL comments are blocked");
        }
        if (BLOCKED_KEYWORDS.matcher(normalized).find()) {
            throw new IllegalArgumentException("Unsafe SQL operation blocked");
        }
        if (RAW_TABLE_REFERENCE.matcher(normalized).find()) {
            throw new IllegalArgumentException("SQL must not reference raw tables directly");
        }
        if (!normalized.contains("scoped_")) {
            throw new IllegalArgumentException("SQL must use scoped tables only");
        }
    }

    private String enforceLimit(String sql) {
        String normalized = sql.toLowerCase(Locale.ROOT);
        if (LIMIT_PATTERN.matcher(sql).find()) {
            return sql;
        }
        if (normalized.contains("count(") || normalized.contains("sum(") || normalized.contains("avg(")) {
            return sql;
        }
        return sql + " LIMIT " + maxRows;
    }

    private String cleanSql(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = raw.trim();
        cleaned = cleaned.replace("```sql", "").replace("```", "").trim();
        if (cleaned.endsWith(";")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1);
        }
        return cleaned;
    }

    private boolean looksLikeTrendQuestion(String question) {
        String q = question.toLowerCase(Locale.ROOT);
        return q.contains("trend") || q.contains("monthly") || q.contains("daily") || q.contains("over time");
    }

    private String findNumericColumn(Map<String, Object> row) {
        Optional<String> priorityMatch = VALUE_COLUMN_PRIORITY.stream()
                .filter(row::containsKey)
                .filter(column -> row.get(column) instanceof Number)
                .findFirst();
        if (priorityMatch.isPresent()) {
            return priorityMatch.get();
        }

        return row.entrySet().stream()
                .filter(entry -> entry.getValue() instanceof Number)
                .map(Map.Entry::getKey)
                .filter(column -> !ID_LIKE_COLUMNS.contains(column))
                .findFirst()
                .orElse(null);
    }

    private String findLabelColumn(Map<String, Object> row, String valueColumn) {
        Optional<String> priorityMatch = LABEL_COLUMN_PRIORITY.stream()
                .filter(row::containsKey)
                .filter(column -> !column.equals(valueColumn))
                .findFirst();
        if (priorityMatch.isPresent()) {
            return priorityMatch.get();
        }

        return row.entrySet().stream()
                .filter(entry -> !entry.getKey().equals(valueColumn))
                .filter(entry -> !ID_LIKE_COLUMNS.contains(entry.getKey()))
                .filter(entry -> entry.getValue() instanceof String
                        || entry.getValue() instanceof java.sql.Date
                        || entry.getValue() instanceof java.time.LocalDate
                        || entry.getValue() instanceof Number)
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }

    private String buildPlotlyCode(String chartType, String xLabel, String yLabel, List<String> labels, List<Double> values) {
        String x = labels.stream().map(s -> "'" + s.replace("'", "\\'") + "'").collect(Collectors.joining(", "));
        String y = values.stream().map(String::valueOf).collect(Collectors.joining(", "));

        if ("line".equals(chartType)) {
            return """
                    import plotly.express as px
                    x = [%s]
                    y = [%s]
                    fig = px.line(x=x, y=y, markers=True, title="%s by %s")
                    fig.update_layout(xaxis_title="%s", yaxis_title="%s")
                    fig.show()
                    """.formatted(x, y, yLabel, xLabel, xLabel, yLabel);
        }

        return """
                import plotly.express as px
                x = [%s]
                y = [%s]
                fig = px.bar(x=x, y=y, title="%s by %s")
                fig.update_layout(xaxis_title="%s", yaxis_title="%s")
                fig.show()
                """.formatted(x, y, yLabel, xLabel, xLabel, yLabel);
    }
}
