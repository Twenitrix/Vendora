package com.vendora.service;

import com.vendora.dto.ApiDtos.NotificationDto;
import com.vendora.entity.Notification;
import com.vendora.entity.User;
import com.vendora.exception.ResourceNotFoundException;
import com.vendora.repository.NotificationRepository;
import com.vendora.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void notifyUser(User recipient, String title, String message, String type, Long referenceId) {
        if (recipient == null) return;
        Notification notification = Notification.builder()
                .user(recipient)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyRole(String roleName, String title, String message, String type, Long referenceId) {
        List<User> recipients = userRepository.findByRole_RoleName(roleName);
        for (User recipient : recipients) {
            notifyUser(recipient, title, message, type, referenceId);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getUserNotifications(User currentUser) {
        return notificationRepository.findByUser_UserIdOrderByCreatedAtDesc(currentUser.getUserId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User currentUser) {
        return notificationRepository.countByUser_UserIdAndIsReadFalse(currentUser.getUserId());
    }

    @Transactional
    public NotificationDto markAsRead(Long notificationId, User currentUser) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new AccessDeniedException("Cannot access or modify another user's notification");
        }
        notification.setIsRead(true);
        return toDto(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllAsRead(User currentUser) {
        List<Notification> list = notificationRepository.findByUser_UserIdOrderByCreatedAtDesc(currentUser.getUserId());
        for (Notification n : list) {
            if (!Boolean.TRUE.equals(n.getIsRead())) {
                n.setIsRead(true);
            }
        }
        notificationRepository.saveAll(list);
    }

    public NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .notificationId(n.getNotificationId())
                .userId(n.getUser().getUserId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .referenceId(n.getReferenceId())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
