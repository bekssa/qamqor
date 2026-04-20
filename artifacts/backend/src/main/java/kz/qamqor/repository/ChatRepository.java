package kz.qamqor.repository;

import kz.qamqor.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ChatRepository extends JpaRepository<Chat, String> {

    @Query("SELECT c FROM Chat c JOIN c.participants p WHERE p.id = :userId")
    List<Chat> findAllByParticipantId(String userId);

    @Modifying
    @Query(value = "DELETE FROM chat_participants WHERE user_id = :userId", nativeQuery = true)
    void removeUserFromAllChats(String userId);
}
