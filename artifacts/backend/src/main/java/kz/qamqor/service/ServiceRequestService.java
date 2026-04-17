package kz.qamqor.service;

import kz.qamqor.dto.request.CreateServiceRequestDto;
import kz.qamqor.dto.request.UpdateStatusRequest;
import kz.qamqor.dto.response.ServiceRequestDto;
import kz.qamqor.entity.ServiceRequest;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.ServiceRequestRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceRequestService {

    private final ServiceRequestRepository requestRepository;
    private final UserRepository userRepository;

    public List<ServiceRequestDto> getAll() {
        return requestRepository.findAll().stream()
            .map(ServiceRequestDto::from)
            .toList();
    }

    public ServiceRequestDto getById(String id) {
        return ServiceRequestDto.from(findOrThrow(id));
    }

    @Transactional
    public ServiceRequestDto create(CreateServiceRequestDto dto) {
        User author = userRepository.findById(dto.authorId())
            .orElseThrow(() -> new AppException("Author not found", HttpStatus.NOT_FOUND));

        ServiceRequest request = ServiceRequest.builder()
            .title(dto.title())
            .description(dto.description())
            .author(author)
            .category(dto.category())
            .location(dto.location())
            .status(ServiceRequest.Status.OPEN)
            .build();

        return ServiceRequestDto.from(requestRepository.save(request));
    }

    @Transactional
    public ServiceRequestDto updateStatus(String id, UpdateStatusRequest dto) {
        ServiceRequest request = findOrThrow(id);
        request.setStatus(dto.status());
        return ServiceRequestDto.from(requestRepository.save(request));
    }

    private ServiceRequest findOrThrow(String id) {
        return requestRepository.findById(id)
            .orElseThrow(() -> new AppException("Request not found", HttpStatus.NOT_FOUND));
    }
}
