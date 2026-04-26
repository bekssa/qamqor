package kz.qamqor.service;

import kz.qamqor.dto.response.NotificationDto;
import kz.qamqor.entity.RequestResponse;
import kz.qamqor.entity.ServiceRequest;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.RequestResponseRepository;
import kz.qamqor.repository.ServiceRequestRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RequestResponseService {

    private static final Logger log = LoggerFactory.getLogger(RequestResponseService.class);

    private final RequestResponseRepository responseRepository;
    private final ServiceRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void respond(String requestId, User volunteer) {
        ServiceRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new AppException("Request not found", HttpStatus.NOT_FOUND));

        if (request.getStatus() != ServiceRequest.Status.OPEN) {
            throw new AppException("Request is not available", HttpStatus.CONFLICT);
        }

        if (responseRepository.existsByRequestIdAndVolunteerId(requestId, volunteer.getId())) {
            return; // idempotent — already responded, treat as success
        }

        User vol = userRepository.findById(volunteer.getId())
            .orElseThrow(() -> new AppException("Volunteer not found", HttpStatus.NOT_FOUND));

        RequestResponse saved = responseRepository.save(RequestResponse.builder()
            .request(request)
            .volunteer(vol)
            .status(RequestResponse.Status.PENDING)
            .build());

        String volunteerName = buildName(vol);
        String authorId = request.getAuthor().getId();

        notificationService.save(authorId, "NEW_RESPONSE", requestId, request.getTitle(), volunteerName, saved.getId());
        messagingTemplate.convertAndSend(
            "/topic/notifications/" + authorId,
            new NotificationDto("NEW_RESPONSE", requestId, request.getTitle(), volunteerName, saved.getId())
        );

        log.info("[RESPONSE] Volunteer {} responded to request {}", vol.getId(), requestId);
    }

    @Transactional
    public void accept(String responseId, User elderly) {
        RequestResponse response = responseRepository.findById(responseId)
            .orElseThrow(() -> new AppException("Response not found", HttpStatus.NOT_FOUND));

        if (!response.getRequest().getAuthor().getId().equals(elderly.getId())) {
            throw new AppException("Forbidden", HttpStatus.FORBIDDEN);
        }

        if (response.getStatus() != RequestResponse.Status.PENDING) {
            throw new AppException("Response already processed", HttpStatus.CONFLICT);
        }

        response.setStatus(RequestResponse.Status.ACCEPTED);
        responseRepository.save(response);

        ServiceRequest request = response.getRequest();
        request.setExecutor(response.getVolunteer());
        request.setStatus(ServiceRequest.Status.IN_PROGRESS);
        requestRepository.save(request);

        String volunteerId = response.getVolunteer().getId();
        String elderlyName = buildName(elderly);

        notificationService.save(volunteerId, "RESPONSE_ACCEPTED", request.getId(), request.getTitle(), elderlyName, null);
        messagingTemplate.convertAndSend(
            "/topic/notifications/" + volunteerId,
            new NotificationDto("RESPONSE_ACCEPTED", request.getId(), request.getTitle(), elderlyName, null)
        );

        log.info("[RESPONSE] Accepted responseId={} volunteerId={}", responseId, volunteerId);
    }

    @Transactional
    public void decline(String responseId, User elderly) {
        RequestResponse response = responseRepository.findById(responseId)
            .orElseThrow(() -> new AppException("Response not found", HttpStatus.NOT_FOUND));

        if (!response.getRequest().getAuthor().getId().equals(elderly.getId())) {
            throw new AppException("Forbidden", HttpStatus.FORBIDDEN);
        }

        if (response.getStatus() != RequestResponse.Status.PENDING) {
            throw new AppException("Response already processed", HttpStatus.CONFLICT);
        }

        response.setStatus(RequestResponse.Status.DECLINED);
        responseRepository.save(response);

        String volunteerId = response.getVolunteer().getId();
        String elderlyName = buildName(elderly);

        notificationService.save(volunteerId, "RESPONSE_DECLINED",
            response.getRequest().getId(), response.getRequest().getTitle(), elderlyName, null);
        messagingTemplate.convertAndSend(
            "/topic/notifications/" + volunteerId,
            new NotificationDto("RESPONSE_DECLINED", response.getRequest().getId(),
                response.getRequest().getTitle(), elderlyName, null)
        );

        log.info("[RESPONSE] Declined responseId={} volunteerId={}", responseId, volunteerId);
    }

    public record MyResponseDto(String requestId, String status) {}

    public List<MyResponseDto> getMyResponses(User volunteer) {
        return responseRepository.findByVolunteerId(volunteer.getId()).stream()
            .map(r -> new MyResponseDto(r.getRequest().getId(), r.getStatus().name()))
            .toList();
    }

    private String buildName(User user) {
        String fn = user.getFirstName();
        String ln = user.getLastName();
        String name = ((fn != null ? fn : "") + " " + (ln != null ? ln : "")).trim();
        return name.isEmpty() ? (user.getName() != null ? user.getName() : user.getEmail()) : name;
    }
}
