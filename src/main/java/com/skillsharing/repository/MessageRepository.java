package com.skillsharing.repository;

import com.skillsharing.model.Message;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Repository
public class MessageRepository {
    private final Map<Long, Message> messages = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);
    
    public Message save(Message message) {
        if (message.getId() == null) {
            message.setId(idCounter.getAndIncrement());
        }
        messages.put(message.getId(), message);
        return message;
    }
    
    public Optional<Message> findById(Long id) {
        return Optional.ofNullable(messages.get(id));
    }
    
    public List<Message> findConversation(Long user1Id, Long user2Id) {
        return messages.values().stream()
                .filter(msg -> (msg.getSenderId().equals(user1Id) && msg.getReceiverId().equals(user2Id)) ||
                              (msg.getSenderId().equals(user2Id) && msg.getReceiverId().equals(user1Id)))
                .sorted(Comparator.comparing(Message::getTimestamp))
                .collect(Collectors.toList());
    }
    
    public List<Message> findByReceiverId(Long receiverId) {
        return messages.values().stream()
                .filter(msg -> msg.getReceiverId().equals(receiverId))
                .sorted(Comparator.comparing(Message::getTimestamp).reversed())
                .collect(Collectors.toList());
    }
}
