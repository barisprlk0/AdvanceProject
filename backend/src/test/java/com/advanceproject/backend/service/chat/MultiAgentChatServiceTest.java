package com.advanceproject.backend.service.chat;

import com.advanceproject.backend.dto.ChatAskRequest;
import com.advanceproject.backend.dto.ChatAskResponse;
import com.advanceproject.backend.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class MultiAgentChatServiceTest {
    private NamedParameterJdbcTemplate jdbcTemplate;
    private OpenAiChatClient openAiChatClient;
    private MultiAgentChatService service;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(NamedParameterJdbcTemplate.class);
        openAiChatClient = mock(OpenAiChatClient.class);
        service = new MultiAgentChatService(jdbcTemplate, openAiChatClient, 200, 3);
    }

    @Test
    void blocksMutationRequestsBeforeSqlExecution() {
        ChatAskResponse response = service.ask(request("delete 50 product from products"), user("INDIVIDUAL"));

        assertThat(response.isInScope()).isFalse();
        assertThat(response.getFinalAnswer()).contains("read-only");
        assertThat(response.getSqlQuery()).isNull();
        verifyNoInteractions(jdbcTemplate);
        verify(openAiChatClient, never()).complete(anyString(), anyString());
    }

    @Test
    void usesStableTemplateForSalesByCategoryQuestion() {
        when(jdbcTemplate.queryForList(anyString(), any(MapSqlParameterSource.class)))
                .thenReturn(List.of(
                        row("category", "Electronics", "revenue", BigDecimal.valueOf(1250)),
                        row("category", "Home", "revenue", BigDecimal.valueOf(800))
                ));

        ChatAskResponse response = service.ask(request("Show me sales by category for last month"), user("ADMIN"));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));

        assertThat(sqlCaptor.getValue()).contains("FROM scoped_order_items");
        assertThat(sqlCaptor.getValue()).contains("DATE_TRUNC('month', o.order_date)");
        assertThat(response.getChart()).isNotNull();
        verify(openAiChatClient, never()).complete(anyString(), anyString());
    }

    @Test
    void combinesLlmTopLevelCteWithRoleScopeCtes() {
        when(openAiChatClient.isEnabled()).thenReturn(true);
        when(openAiChatClient.complete(anyString(), anyString()))
                .thenReturn("""
                        WITH latest AS (
                            SELECT COUNT(*) AS order_count
                            FROM scoped_orders
                        )
                        SELECT order_count
                        FROM latest
                        """, null);
        when(jdbcTemplate.queryForList(anyString(), any(MapSqlParameterSource.class)))
                .thenReturn(List.of(row("order_count", 42)));

        service.ask(request("Give me an order insight"), user("ADMIN"));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));

        assertThat(sqlCaptor.getValue()).contains("scoped_categories AS");
        assertThat(sqlCaptor.getValue()).contains(",\nlatest AS");
        assertThat(sqlCaptor.getValue()).doesNotContain(")\nWITH latest");
    }

    @Test
    void rewritesRawTablesFromLlmBeforeExecution() {
        when(openAiChatClient.isEnabled()).thenReturn(true);
        when(openAiChatClient.complete(anyString(), anyString()))
                .thenReturn("""
                        SELECT u.email, COUNT(*) AS order_count
                        FROM scoped_orders o
                        JOIN users u ON u.id = o.user_id
                        GROUP BY u.email
                        LIMIT 5
                        """, null);
        when(jdbcTemplate.queryForList(anyString(), any(MapSqlParameterSource.class)))
                .thenReturn(List.of(row("email", "customer@example.com", "order_count", 4)));

        service.ask(request("Give customer order counts"), user("CORPORATE"));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));

        assertThat(sqlCaptor.getValue()).contains("JOIN scoped_users u ON u.id = o.user_id");
        assertThat(sqlCaptor.getValue()).doesNotContain("JOIN users u");
    }

    @Test
    void doesNotCreateChartForDetailOrderLists() {
        when(jdbcTemplate.queryForList(anyString(), any(MapSqlParameterSource.class)))
                .thenReturn(List.of(
                        row("id", 10, "status", "Pending", "grand_total", BigDecimal.TEN),
                        row("id", 11, "status", "Pending", "grand_total", BigDecimal.ONE)
                ));

        ChatAskResponse response = service.ask(request("list pending orders"), user("ADMIN"));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));

        assertThat(response.getFinalAnswer()).contains("Found 2 matching rows");
        assertThat(response.getChart()).isNull();
        assertThat(sqlCaptor.getValue()).contains("LIMIT 20");
        assertThat(sqlCaptor.getValue()).doesNotContain("LIMIT 20 LIMIT");
    }

    @Test
    void usesScopedProductsForMostSoldProductsQuestion() {
        when(jdbcTemplate.queryForList(anyString(), any(MapSqlParameterSource.class)))
                .thenReturn(List.of(
                        row("product", "Classic T-Shirt", "quantity_sold", 82, "revenue", BigDecimal.valueOf(1200)),
                        row("product", "Running Shoes", "quantity_sold", 64, "revenue", BigDecimal.valueOf(2400))
                ));

        service.ask(request("Which of my products sold the most?"), user("CORPORATE"));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sqlCaptor.capture(), any(MapSqlParameterSource.class));

        assertThat(sqlCaptor.getValue()).contains("FROM scoped_products p");
        assertThat(sqlCaptor.getValue()).contains("JOIN scoped_order_items oi ON oi.product_id = p.id");
        assertThat(sqlCaptor.getValue()).contains("ORDER BY quantity_sold DESC");
        verify(openAiChatClient, never()).complete(anyString(), anyString());
    }

    private ChatAskRequest request(String question) {
        ChatAskRequest request = new ChatAskRequest();
        request.setQuestion(question);
        request.setSessionId("test-session");
        return request;
    }

    private User user(String role) {
        User user = new User();
        user.setId(1);
        user.setRoleType(role);
        user.setEmail("test@example.com");
        return user;
    }

    private Map<String, Object> row(Object... values) {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int i = 0; i < values.length; i += 2) {
            row.put(values[i].toString(), values[i + 1]);
        }
        return row;
    }
}
