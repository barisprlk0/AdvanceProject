package com.advanceproject.backend.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    private final JdbcTemplate jdbcTemplate;

    public AnalyticsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> getAdminAnalytics() {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("summary", safeQueryForMap("""
                SELECT
                    COUNT(*) AS order_count,
                    COALESCE(SUM(grand_total), 0) AS total_revenue,
                    COALESCE(AVG(grand_total), 0) AS average_order
                FROM orders
                """));

        result.put("completion", safeQueryForMap(
                """
                        SELECT
                            COALESCE(SUM(CASE WHEN LOWER(COALESCE(s.status, o.status, '')) LIKE '%deliver%' THEN 1 ELSE 0 END), 0) AS delivered_orders,
                            COUNT(*) AS total_orders
                        FROM orders o
                        LEFT JOIN shipments s ON s.order_id = o.id
                        """));

        result.put("platform", safeQueryForMap(
                """
                        SELECT
                            (SELECT COUNT(*) FROM users) AS user_count,
                            (SELECT COUNT(*) FROM stores) AS store_count,
                            (SELECT COUNT(*) FROM stores WHERE LOWER(COALESCE(status, '')) LIKE '%active%') AS active_store_count,
                            (SELECT COUNT(*) FROM products) AS product_count,
                            (SELECT COUNT(DISTINCT category_id) FROM products WHERE category_id IS NOT NULL) AS category_count,
                            (SELECT COUNT(*) FROM reviews) AS review_count,
                            (SELECT COALESCE(AVG(star_rating), 0) FROM reviews) AS average_rating
                        """));

        result.put("monthlyRevenue", safeQueryForList(
                """
                        SELECT
                            EXTRACT(MONTH FROM o.order_date) AS month,
                            COALESCE(SUM(o.grand_total), 0) AS revenue,
                            COALESCE(SUM(CASE WHEN LOWER(COALESCE(s.status, o.status, '')) LIKE '%deliver%' THEN o.grand_total ELSE 0 END), 0) AS delivered_revenue
                        FROM orders o
                        LEFT JOIN shipments s ON s.order_id = o.id
                        WHERE o.order_date IS NOT NULL
                        GROUP BY EXTRACT(MONTH FROM o.order_date)
                        ORDER BY month
                        """));

        result.put("statusDistribution", jdbcTemplate.queryForList(
                """
                        SELECT
                            CASE
                                WHEN LOWER(COALESCE(s.status, o.status, '')) LIKE '%deliver%' THEN 'delivered'
                                WHEN LOWER(COALESCE(s.status, o.status, '')) LIKE '%ship%' OR LOWER(COALESCE(s.status, o.status, '')) LIKE '%transit%' THEN 'shipped'
                                WHEN LOWER(COALESCE(s.status, o.status, '')) LIKE '%process%' THEN 'processing'
                                WHEN LOWER(COALESCE(s.status, o.status, '')) LIKE '%cancel%' THEN 'cancelled'
                                ELSE 'pending'
                            END AS status,
                            COUNT(*) AS count
                        FROM orders o
                        LEFT JOIN shipments s ON s.order_id = o.id
                        GROUP BY status
                        ORDER BY count DESC
                        """));

        result.put("roleDistribution", jdbcTemplate.queryForList("""
                SELECT role_type AS role, COUNT(*) AS count
                FROM users
                GROUP BY role_type
                ORDER BY count DESC
                """));

        result.put("ratingDistribution", jdbcTemplate.queryForList("""
                SELECT star_rating AS rating, COUNT(*) AS count
                FROM reviews
                WHERE star_rating IS NOT NULL
                GROUP BY star_rating
                ORDER BY star_rating
                """));

        result.put("topStores", safeQueryForList("""
                SELECT
                    s.id,
                    s.name,
                    s.status,
                    u.email AS owner_email,
                    COALESCE(pc.product_count, 0) AS product_count,
                    COALESCE(oc.order_count, 0) AS order_count,
                    COALESCE(oc.revenue, 0) AS revenue
                FROM stores s
                LEFT JOIN users u ON u.id = s.owner_id
                LEFT JOIN (
                    SELECT store_id, COUNT(*) AS product_count
                    FROM products
                    GROUP BY store_id
                ) pc ON pc.store_id = s.id
                LEFT JOIN (
                    SELECT store_id, COUNT(*) AS order_count, COALESCE(SUM(grand_total), 0) AS revenue
                    FROM orders
                    GROUP BY store_id
                ) oc ON oc.store_id = s.id
                ORDER BY revenue DESC
                LIMIT 8
                """));

        result.put("categoryPerformance", safeQueryForList("""
                SELECT
                    COALESCE(c.name, 'Diğer') AS name,
                    COUNT(DISTINCT p.id) AS product_count,
                    COALESCE(SUM(oi.quantity), 0) AS sold_count,
                    COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN order_items oi ON oi.product_id = p.id
                GROUP BY COALESCE(c.name, 'Diğer')
                ORDER BY revenue DESC
                LIMIT 8
                """));

        result.put("recentReviews", safeQueryForList("""
                SELECT
                    r.id,
                    r.star_rating,
                    r.helpfulness_votes,
                    r.sentiment,
                    u.email AS user_email,
                    p.name AS product_name
                FROM reviews r
                LEFT JOIN users u ON u.id = r.user_id
                LEFT JOIN products p ON p.id = r.product_id
                ORDER BY r.id DESC
                LIMIT 8
                """));
        return result;
    }

    public Map<String, Object> getCorporateAnalytics(Integer ownerId) {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("summary", safeQueryForMap("""
                SELECT
                    COUNT(*) AS order_count,
                    COALESCE(SUM(o.grand_total), 0) AS total_revenue
                FROM orders o
                JOIN stores s ON s.id = o.store_id
                WHERE s.owner_id = ?
                """, ownerId));

        result.put("products", safeQueryForMap("""
                SELECT
                    COUNT(*) AS total_products,
                    COALESCE(SUM(CASE WHEN p.stock_quantity < 10 THEN 1 ELSE 0 END), 0) AS low_stock_count
                FROM products p
                JOIN stores s ON s.id = p.store_id
                WHERE s.owner_id = ?
                """, ownerId));

        result.put("recentOrders", safeQueryForList("""
                SELECT
                    o.id,
                    o.order_date,
                    o.status,
                    o.grand_total,
                    u.email AS customer_email
                FROM orders o
                JOIN stores s ON s.id = o.store_id
                JOIN users u ON u.id = o.user_id
                WHERE s.owner_id = ?
                ORDER BY o.order_date DESC
                LIMIT 5
                """, ownerId));

        return result;
    }

    public Map<String, Object> getIndividualAnalytics(Integer userId) {
        Map<String, Object> result = new LinkedHashMap<>();

        // Summary: Total spent and order count
        result.put("summary", safeQueryForMap("""
                SELECT
                    COUNT(*) AS order_count,
                    COALESCE(SUM(grand_total), 0) AS total_spent
                FROM orders
                WHERE user_id = ?
                """, userId));

        // Shipments: Active vs Total
        result.put("shipments", safeQueryForMap("""
                SELECT
                    COUNT(s.id) AS total_shipments,
                    COALESCE(SUM(CASE 
                        WHEN LOWER(COALESCE(s.status, '')) NOT LIKE '%deliver%' 
                         AND LOWER(COALESCE(s.status, '')) NOT LIKE '%cancel%' 
                        THEN 1 ELSE 0 END), 0) AS active_shipments
                FROM orders o
                LEFT JOIN shipments s ON s.order_id = o.id
                WHERE o.user_id = ?
                """, userId));

        // Monthly Spending Trend
        result.put("monthlySpending", safeQueryForList("""
                SELECT
                    EXTRACT(MONTH FROM order_date) AS month,
                    COALESCE(SUM(grand_total), 0) AS spent
                FROM orders
                WHERE user_id = ? AND order_date IS NOT NULL
                GROUP BY EXTRACT(MONTH FROM order_date)
                ORDER BY month
                """, userId));

        return result;
    }

    private List<Map<String, Object>> safeQueryForList(String sql, Object... args) {
        try {
            System.out.println("Executing SQL: " + sql + " with args: " + java.util.Arrays.toString(args));
            List<Map<String, Object>> list = jdbcTemplate.queryForList(sql, args);
            return list.stream().map(m -> {
                Map<String, Object> lowerMap = new LinkedHashMap<>();
                m.forEach((k, v) -> lowerMap.put(k.toLowerCase(), v));
                return lowerMap;
            }).toList();
        } catch (Exception e) {
            System.err.println("SQL Execution Error: " + e.getMessage());
            e.printStackTrace();
            return new java.util.ArrayList<>();
        }
    }

    private Map<String, Object> safeQueryForMap(String sql, Object... args) {
        List<Map<String, Object>> list = safeQueryForList(sql, args);
        if (list.isEmpty()) {
            return new LinkedHashMap<>();
        }
        return list.get(0);
    }
}

