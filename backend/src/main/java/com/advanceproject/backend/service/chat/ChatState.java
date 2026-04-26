package com.advanceproject.backend.service.chat;

import com.advanceproject.backend.dto.ChatChartData;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
public class ChatState {
    private String question;
    private String roleType;
    private Integer userId;
    private boolean inScope = true;
    private boolean greeting = false;
    private String rejectionReason;
    private String sqlQuery;
    private List<Map<String, Object>> queryResult = new ArrayList<>();
    private String error;
    private int iterationCount = 0;
    private String finalAnswer;
    private ChatChartData chart;
}
