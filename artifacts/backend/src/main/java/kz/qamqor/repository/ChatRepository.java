package kz.qamqor.repository;

import kz.qamqor.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRepository extends JpaRepository<Chat, String> {

    @Query("SELECT c FROM Chat c JOIN c.participants p WHERE p.id = :userId")
    List<Chat> findAllByParticipantId(String userId);

    @Query("SELECT c FROM Chat c WHERE SIZE(c.participants) = 2 " +
           "AND EXISTS (SELECT p FROM c.participants p WHERE p.id = :id1) " +
           "AND EXISTS (SELECT p FROM c.participants p WHERE p.id = :id2)")
    Optional<Chat> findByTwoParticipants(@Param("id1") String id1, @Param("id2") String id2);

    @Modifying
    @Query(value = "DELETE FROM chat_participants WHERE user_id = :userId", nativeQuery = true)
    void removeUserFromAllChats(String userId);
}
