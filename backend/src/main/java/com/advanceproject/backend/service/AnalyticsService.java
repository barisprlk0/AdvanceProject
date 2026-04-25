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

        result.put("summary", jdbcTemplate.queryForMap("""
                SELECT
                    COUNT(*) AS order_count,
                    COALESCE(SUM(grand_total), 0) AS total_revenue,
                    COALESCE(AVG(grand_total), 0) AS average_order
                FROM orders
                """));

        result.put("completion", jdbcTemplate.queryForMap("""
                SELECT
                    COUNT(*) FILTER (WHERE LOWER(COALESCE(s.status, o.status, '')) LIKE '%deliver%') AS delivered_orders,
                    COUNT(*) AS total_orders
                FROM orders o
                LEFT JOIN shipments s ON s.order_id = o.id
                """));

        result.put("platform", jdbcTemplate.queryForMap("""
                SELECT
                    (SELECT COUNT(*) FROM users) AS user_count,
                    (SELECT COUNT(*) FROM stores) AS store_count,
                    (SELECT COUNT(*) FROM stores WHERE LOWER(COALESCE(status, '')) LIKE '%active%') AS active_store_count,
                    (SELECT COUNT(*) FROM products) AS product_count,
                    (SELECT COUNT(DISTINCT category_id) FROM products WHERE category_id IS NOT NULL) AS category_count,
                    (SELECT COUNT(*) FROM reviews) AS review_count,
                    (SELECT COALESCE(AVG(star_rating), 0) FROM reviews) AS average_rating
                """));

        result.put("monthlyRevenue", jdbcTemplate.queryForList("""
                SELECT
                    EXTRACT(MONTH FROM o.order_date)::int AS month,
                    COALESCE(SUM(o.grand_total), 0) AS revenue,
                    COALESCE(SUM(o.grand_total) FILTER (WHERE LOWER(COALESCE(s.status, o.status, '')) LIKE '%deliver%'), 0) AS delivered_revenue
                FROM orders o
                LEFT JOIN shipments s ON s.order_id = o.id
                WHERE o.order_date IS NOT NULL
                GROUP BY EXTRACT(MONTH FROM o.order_date)
                ORDER BY month
                """));

        result.put("statusDistribution", jdbcTemplate.queryForList("""
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

        result.put("topStores", jdbcTemplate.queryForList("""
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

        result.put("categoryPerformance", jdbcTemplate.queryForList("""
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

        result.put("recentReviews", jdbcTemplate.queryForList("""
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
}
