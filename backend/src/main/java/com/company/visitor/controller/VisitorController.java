package com.company.visitor.controller;

import com.company.visitor.domain.Visitor;
import com.company.visitor.domain.VisitorStatus;
import com.company.visitor.dto.CheckoutRequest;
import com.company.visitor.dto.RejectRequest;
import com.company.visitor.dto.StatsResponse;
import com.company.visitor.dto.VisitorCreateRequest;
import com.company.visitor.service.VisitorService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/visitors")
public class VisitorController {

    private final VisitorService service;

    public VisitorController(VisitorService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Visitor create(@Valid @RequestBody VisitorCreateRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<Visitor> list(
            @RequestParam(required = false) VisitorStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.list(status, keyword, date);
    }

    @GetMapping("/{id}")
    public Visitor get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping("/{id}/approve")
    public Visitor approve(@PathVariable long id) {
        return service.approve(id);
    }

    @PostMapping("/{id}/reject")
    public Visitor reject(@PathVariable long id, @Valid @RequestBody(required = false) RejectRequest request) {
        return service.reject(id, request == null ? null : request.reason());
    }

    @PostMapping("/{id}/checkout")
    public Visitor checkout(@PathVariable long id, @Valid @RequestBody(required = false) CheckoutRequest request) {
        return service.checkout(id, request == null ? null : request.badgeReturned());
    }

    @GetMapping("/stats")
    public StatsResponse stats() {
        return service.stats();
    }
}
