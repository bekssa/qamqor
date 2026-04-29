package kz.qamqor.service;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@Slf4j
@Service
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${minio.public-url:${minio.url}}")
    private String publicUrl;

    public MinioService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    public String uploadAvatar(String userId, MultipartFile file) {
        try {
            String ext = getExtension(file.getOriginalFilename(), file.getContentType());
            String objectName = "avatars/" + userId + "/" + UUID.randomUUID() + "." + ext;

            try (InputStream stream = file.getInputStream()) {
                minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(stream, file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
            }

            String url = publicUrl.replaceAll("/+$", "") + "/" + bucket + "/" + objectName;
            log.info("[MINIO] Uploaded avatar for userId={} url={}", userId, url);
            return url;
        } catch (Exception e) {
            log.error("[MINIO] Upload failed for userId={}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to upload avatar", e);
        }
    }

    public String uploadDocument(String userId, String documentType, MultipartFile file) {
        try {
            String objectName = "documents/" + userId + "/" + documentType + "_" + UUID.randomUUID() + ".pdf";

            try (InputStream stream = file.getInputStream()) {
                minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(stream, file.getSize(), -1)
                    .contentType("application/pdf")
                    .build());
            }

            String url = publicUrl.replaceAll("/+$", "") + "/" + bucket + "/" + objectName;
            log.info("[MINIO] Uploaded document for userId={} type={} url={}", userId, documentType, url);
            return url;
        } catch (Exception e) {
            log.error("[MINIO] Document upload failed for userId={} type={}: {}", userId, documentType, e.getMessage());
            throw new RuntimeException("Failed to upload document", e);
        }
    }

    public void ensurePublicBucketPolicy() {
        try {
            String policy = """
                {
                  "Version": "2012-10-17",
                  "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": ["arn:aws:s3:::%s/*"]
                  }]
                }
                """.formatted(bucket);
            minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                .bucket(bucket)
                .config(policy)
                .build());
            log.info("[MINIO] Public read policy set on bucket '{}'", bucket);
        } catch (Exception e) {
            log.warn("[MINIO] Could not set bucket policy: {}", e.getMessage());
        }
    }

    private String getExtension(String filename, String contentType) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        }
        if (contentType != null) {
            return switch (contentType) {
                case "image/jpeg" -> "jpg";
                case "image/png"  -> "png";
                case "image/gif"  -> "gif";
                case "image/webp" -> "webp";
                default           -> "jpg";
            };
        }
        return "jpg";
    }
}
