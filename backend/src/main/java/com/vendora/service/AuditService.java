package com.vendora.service;

import com.vendora.dto.ApiDtos.AuditLogDto;
import com.vendora.entity.AuditLog;
import com.vendora.entity.User;
import com.vendora.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(User actor, String module, String action, String entityType, Long entityId, String details) {
        AuditLog log = AuditLog.builder()
                .actorId(actor != null ? actor.getUserId() : null)
                .actorEmail(actor != null ? actor.getEmail() : "system@vendora.io")
                .actorRole(actor != null && actor.getRole() != null ? actor.getRole().getRoleName() : "SYSTEM")
                .module(module)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLogDto> getAllLogs(String module) {
        List<AuditLog> logs = (module != null && !module.isBlank() && !"ALL".equalsIgnoreCase(module))
                ? auditLogRepository.findByModuleIgnoreCaseOrderByCreatedAtDesc(module)
                : auditLogRepository.findAllByOrderByCreatedAtDesc();
        return logs.stream().map(this::toDto).collect(Collectors.toList());
    }

    public AuditLogDto toDto(AuditLog log) {
        return AuditLogDto.builder()
                .auditId(log.getAuditId())
                .actorId(log.getActorId())
                .actorEmail(log.getActorEmail())
                .actorRole(log.getActorRole())
                .module(log.getModule())
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .details(log.getDetails())
                .ipAddress(log.getIpAddress())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
