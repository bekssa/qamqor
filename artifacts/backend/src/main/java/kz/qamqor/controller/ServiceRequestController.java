package kz.qamqor.controller;

import jakarta.validation.Valid;
import kz.qamqor.dto.request.CreateServiceRequestDto;
import kz.qamqor.dto.request.UpdateStatusRequest;
import kz.qamqor.dto.response.ServiceRequestDto;
import kz.qamqor.service.ServiceRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/requests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestService service;

    @GetMapping
    public ResponseEntity<List<ServiceRequestDto>> list() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceRequestDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<ServiceRequestDto> create(@Valid @RequestBody CreateServiceRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ServiceRequestDto> updateStatus(
        @PathVariable String id,
        @Valid @RequestBody UpdateStatusRequest dto
    ) {
        return ResponseEntity.ok(service.updateStatus(id, dto));
    }
}
