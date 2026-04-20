package kz.qamqor.repository;

import kz.qamqor.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findAllByChatIdOrderByCreatedAtAsc(String chatId);

    @Modifying
    @Query("DELETE FROM Message m WHERE m.sender.id = :senderId")
    void deleteAllBySenderId(String senderId);
}
