package kz.qamqor.service;

import kz.qamqor.dto.request.CreateServiceRequestDto;
import kz.qamqor.dto.request.UpdateStatusRequest;
import kz.qamqor.dto.response.NotificationDto;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceRequestService {

    private static final Logger log = LoggerFactory.getLogger(ServiceRequestService.class);

    private final ServiceRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    public List<ServiceRequestDto> getAll(User currentUser) {
        List<ServiceRequest> requests = (currentUser.getRole() == User.Role.VOLUNTEER)
            ? requestRepository.findForVolunteer(currentUser.getId())
            : requestRepository.findAll();
        log.debug("[REQUEST] getAll role={} count={}", currentUser.getRole(), requests.size());
        return requests.stream().map(ServiceRequestDto::from).toList();
    }

    public ServiceRequestDto getById(String id) {
        log.debug("[REQUEST] getById id={}", id);
        return ServiceRequestDto.from(findOrThrow(id));
    }

    @Transactional
    public ServiceRequestDto create(CreateServiceRequestDto dto, User currentUser) {
        log.info("[REQUEST] create authorId={} title='{}' category={} location={} price={} scheduledDate={}",
            currentUser.getId(), dto.title(), dto.category(), dto.location(), dto.price(), dto.scheduledDate());

        User author = userRepository.findById(currentUser.getId())
            .orElseThrow(() -> new AppException("Author not found", HttpStatus.NOT_FOUND));

        ServiceRequest request = ServiceRequest.builder()
            .title(dto.title())
            .description(dto.description())
            .author(author)
            .category(dto.category())
            .location(dto.location())
            .price(dto.price())
            .scheduledDate(dto.scheduledDate())
            .status(ServiceRequest.Status.OPEN)
            .build();

        ServiceRequestDto result = ServiceRequestDto.from(requestRepository.save(request));
        log.info("[REQUEST] Created id={} authorId={} status=OPEN", result.id(), author.getId());
        return result;
    }

    public List<ServiceRequestDto> getMyRequests(User currentUser) {
        return requestRepository.findAllByAuthorId(currentUser.getId())
            .stream().map(ServiceRequestDto::from).toList();
    }

    public List<ServiceRequestDto> getAssignedRequests(User currentUser) {
        return requestRepository.findAllByExecutorId(currentUser.getId())
            .stream().map(ServiceRequestDto::from).toList();
    }

    public List<ServiceRequestDto> getAvailableRequests(User currentUser) {
        return requestRepository.findForVolunteer(currentUser.getId())
            .stream().map(ServiceRequestDto::from).toList();
    }

    @Transactional
    public ServiceRequestDto updateStatus(String id, UpdateStatusRequest dto) {
        ServiceRequest request = findOrThrow(id);
        ServiceRequest.Status prev = request.getStatus();

        // Read executor ID before save to avoid lazy-load issues after flush
        String executorId = (request.getExecutor() != null) ? request.getExecutor().getId() : null;

        request.setStatus(dto.status());
        if (dto.price() != null) {
            request.setPrice(dto.price());
        }
        ServiceRequestDto result = ServiceRequestDto.from(requestRepository.save(request));
        log.info("[REQUEST] Status updated id={} {} -> {} price={}", id, prev, dto.status(), dto.price());

        if (dto.status() == ServiceRequest.Status.CANCELLED && executorId != null) {
            notificationService.save(executorId, "REQUEST_CANCELLED", request.getId(), request.getTitle(), null);
            messagingTemplate.convertAndSend(
                "/topic/notifications/" + executorId,
                new NotificationDto("REQUEST_CANCELLED", request.getId(), request.getTitle(), null, null)
            );
            log.info("[REQUEST] Cancel notified volunteerId={}", executorId);
        }

        if (dto.status() == ServiceRequest.Status.COMPLETED) {
            String authorId = request.getAuthor().getId();
            String executorName = null;
            if (executorId != null) {
                User exec = userRepository.findById(executorId).orElse(null);
                if (exec != null) {
                    String fn = exec.getFirstName(); String ln = exec.getLastName();
                    executorName = ((fn != null ? fn : "") + " " + (ln != null ? ln : "")).trim();
                    if (executorName.isEmpty()) executorName = exec.getName() != null ? exec.getName() : exec.getEmail();
                }
            }
            notificationService.save(authorId, "REQUEST_COMPLETED", request.getId(), request.getTitle(), executorName, executorId, null);
            messagingTemplate.convertAndSend(
                "/topic/notifications/" + authorId,
                new NotificationDto("REQUEST_COMPLETED", request.getId(), request.getTitle(), executorName, executorId)
            );
            log.info("[REQUEST] Completed notified authorId={}", authorId);
        }

        return result;
    }

    @Transactional
    public void inviteVolunteer(String requestId, String volunteerId, User currentUser) {
        ServiceRequest request = findOrThrow(requestId);
        if (!request.getAuthor().getId().equals(currentUser.getId())) {
            throw new AppException("Forbidden", HttpStatus.FORBIDDEN);
        }
        if (request.getStatus() != ServiceRequest.Status.OPEN) {
            throw new AppException("Request is not open", HttpStatus.CONFLICT);
        }
        User volunteer = userRepository.findById(volunteerId)
            .orElseThrow(() -> new AppException("Volunteer not found", HttpStatus.NOT_FOUND));

        String fn = currentUser.getFirstName(); String ln = currentUser.getLastName();
        String authorName = ((fn != null ? fn : "") + " " + (ln != null ? ln : "")).trim();
        if (authorName.isEmpty()) authorName = currentUser.getName() != null ? currentUser.getName() : currentUser.getEmail();

        notificationService.save(volunteerId, "NEW_INVITE", requestId, request.getTitle(), authorName);
        messagingTemplate.convertAndSend(
            "/topic/notifications/" + volunteerId,
            new NotificationDto("NEW_INVITE", requestId, request.getTitle(), authorName, null)
        );
        log.info("[INVITE] authorId={} invited volunteerId={} to requestId={}", currentUser.getId(), volunteerId, requestId);
    }

    @Transactional
    public void replyToInvite(String requestId, boolean accepted, User volunteer) {
        ServiceRequest request = findOrThrow(requestId);
        if (request.getStatus() != ServiceRequest.Status.OPEN) {
            throw new AppException("Request is no longer open", HttpStatus.CONFLICT);
        }

        String authorId = request.getAuthor().getId();
        String fn = volunteer.getFirstName(); String ln = volunteer.getLastName();
        String volunteerName = ((fn != null ? fn : "") + " " + (ln != null ? ln : "")).trim();
        if (volunteerName.isEmpty()) volunteerName = volunteer.getName() != null ? volunteer.getName() : volunteer.getEmail();

        if (accepted) {
            User vol = userRepository.findById(volunteer.getId())
                .orElseThrow(() -> new AppException("Volunteer not found", HttpStatus.NOT_FOUND));
            request.setExecutor(vol);
            request.setStatus(ServiceRequest.Status.IN_PROGRESS);
            requestRepository.save(request);

            notificationService.setStatusByRequestId(requestId, "NEW_INVITE", "ACCEPTED");
            notificationService.save(authorId, "INVITE_ACCEPTED", requestId, request.getTitle(), volunteerName);
            messagingTemplate.convertAndSend(
                "/topic/notifications/" + authorId,
                new NotificationDto("INVITE_ACCEPTED", requestId, request.getTitle(), volunteerName, null)
            );
            log.info("[INVITE] Accepted volunteerId={} requestId={}", volunteer.getId(), requestId);
        } else {
            notificationService.setStatusByRequestId(requestId, "NEW_INVITE", "DECLINED");
            notificationService.save(authorId, "INVITE_DECLINED", requestId, request.getTitle(), volunteerName);
            messagingTemplate.convertAndSend(
                "/topic/notifications/" + authorId,
                new NotificationDto("INVITE_DECLINED", requestId, request.getTitle(), volunteerName, null)
            );
            log.info("[INVITE] Declined volunteerId={} requestId={}", volunteer.getId(), requestId);
        }
    }

    @Transactional
    public ServiceRequestDto acceptRequest(String id, User volunteer) {
        ServiceRequest request = findOrThrow(id);

        if (request.getStatus() != ServiceRequest.Status.OPEN) {
            throw new AppException("Request is not available for acceptance", HttpStatus.CONFLICT);
        }

        User executor = userRepository.findById(volunteer.getId())
            .orElseThrow(() -> new AppException("Volunteer not found", HttpStatus.NOT_FOUND));

        request.setExecutor(executor);
        request.setStatus(ServiceRequest.Status.IN_PROGRESS);
        ServiceRequestDto result = ServiceRequestDto.from(requestRepository.save(request));

        String vfn = executor.getFirstName();
        String vln = executor.getLastName();
        String volunteerName = ((vfn != null ? vfn : "") + " " + (vln != null ? vln : "")).trim();
        if (volunteerName.isEmpty()) volunteerName = executor.getName() != null ? executor.getName() : executor.getEmail();

        String authorId = request.getAuthor().getId();
        notificationService.save(authorId, "REQUEST_ACCEPTED", request.getId(), request.getTitle(), volunteerName);
        messagingTemplate.convertAndSend(
            "/topic/notifications/" + authorId,
            new NotificationDto("REQUEST_ACCEPTED", request.getId(), request.getTitle(), volunteerName, null)
        );

        log.info("[REQUEST] Accepted id={} volunteerId={}", id, volunteer.getId());
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
