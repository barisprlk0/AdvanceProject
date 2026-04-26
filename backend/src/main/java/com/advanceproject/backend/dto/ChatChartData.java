package com.advanceproject.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ChatChartData {
    private String type;
    private String title;
    private String xLabel;
    private String yLabel;
    private List<String> labels;
    private List<Double> values;
    private String visualizationCode;
}
