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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceRequestService {

    private static final Logger log = LoggerFactory.getLogger(ServiceRequestService.class);

    private final ServiceRequestRepository requestRepository;
    private final UserRepository userRepository;

    public List<ServiceRequestDto> getAll() {
        List<ServiceRequestDto> list = requestRepository.findAll().stream()
            .map(ServiceRequestDto::from)
            .toList();
        log.debug("[REQUEST] getAll count={}", list.size());
        return list;
    }

    public ServiceRequestDto getById(String id) {
        log.debug("[REQUEST] getById id={}", id);
        return ServiceRequestDto.from(findOrThrow(id));
    }

    @Transactional
    public ServiceRequestDto create(CreateServiceRequestDto dto) {
        log.info("[REQUEST] create authorId={} title='{}' category={} location={}",
            dto.authorId(), dto.title(), dto.category(), dto.location());

        User author = userRepository.findById(dto.authorId())
            .orElseThrow(() -> {
                log.warn("[REQUEST] Author not found authorId={}", dto.authorId());
                return new AppException("Author not found", HttpStatus.NOT_FOUND);
            });

        ServiceRequest request = ServiceRequest.builder()
            .title(dto.title())
            .description(dto.description())
            .author(author)
            .category(dto.category())
            .location(dto.location())
            .status(ServiceRequest.Status.OPEN)
            .build();

        ServiceRequestDto result = ServiceRequestDto.from(requestRepository.save(request));
        log.info("[REQUEST] Created id={} authorId={} status=OPEN", result.id(), dto.authorId());
        return result;
    }

    @Transactional
    public ServiceRequestDto updateStatus(String id, UpdateStatusRequest dto) {
        ServiceRequest request = findOrThrow(id);
        ServiceRequest.Status prev = request.getStatus();
        request.setStatus(dto.status());
        ServiceRequestDto result = ServiceRequestDto.from(requestRepository.save(request));
        log.info("[REQUEST] Status updated id={} {} -> {}", id, prev, dto.status());
        return result;
    }

    private ServiceRequest findOrThrow(String id) {
        return requestRepository.findById(id)
            .orElseThrow(() -> {
                log.warn("[REQUEST] Not found id={}", id);
                return new AppException("Request not found", HttpStatus.NOT_FOUND);
            });
    }
}
