package com.company.visitor.controller;

import com.company.visitor.dto.CheckoutRequest;
import com.company.visitor.dto.ConfirmRequest;
import com.company.visitor.dto.CreateVisitorRequest;
import com.company.visitor.dto.ForceLeaveRequest;
import com.company.visitor.dto.RejectRequest;
import com.company.visitor.dto.StatsResponse;
import com.company.visitor.model.Visitor;
import com.company.visitor.service.VisitorService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class VisitorController {

    private final VisitorService service;

    public VisitorController(VisitorService service) {
        this.service = service;
    }

    @PostMapping("/visitors")
    public ResponseEntity<Visitor> create(@Valid @RequestBody CreateVisitorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @GetMapping("/visitors")
    public List<Visitor> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String keyword) {
        return service.list(status, date, keyword);
    }

    @GetMapping("/visitors/{id}")
    public Visitor get(@PathVariable long id) {
        return service.getById(id);
    }

    @PostMapping("/visitors/{id}/confirm")
    public Visitor confirm(
            @PathVariable long id,
            @Valid @RequestBody(required = false) ConfirmRequest request) {
        return service.confirm(id, request == null ? null : request.companion());
    }

    @PostMapping("/visitors/{id}/reject")
    public Visitor reject(
            @PathVariable long id,
            @Valid @RequestBody(required = false) RejectRequest request) {
        return service.reject(id, request == null ? null : request.reason());
    }

    @PostMapping("/visitors/{id}/checkout")
    public Visitor checkout(@PathVariable long id, @Valid @RequestBody CheckoutRequest request) {
        return service.checkout(id, request.badgeReturned());
    }

    @PostMapping("/visitors/{id}/force-leave")
    public Visitor forceLeave(@PathVariable long id, @Valid @RequestBody ForceLeaveRequest request) {
        return service.forceLeave(id, request.reason());
    }

    @GetMapping("/stats/today")
    public StatsResponse todayStats() {
        return service.todayStats();
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
