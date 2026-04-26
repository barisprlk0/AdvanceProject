package com.advanceproject.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class ChatAskResponse {
    private boolean inScope;
    private boolean greeting;
    private String roleScope;
    private String finalAnswer;
    private String sqlQuery;
    private String rejectionReason;
    private boolean blocked;
    private boolean sqlGenerated;
    private int retryCount;
    private List<Map<String, Object>> rows;
    private ChatChartData chart;
}
