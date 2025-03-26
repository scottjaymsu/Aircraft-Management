package com.harris.cinnato.outputs;


import org.springframework.web.bind.annotation.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.Map;
import java.util.HashMap;
import org.springframework.http.ResponseEntity;


@RestController
@RequestMapping("/messages")
public class MessageController {
    private static final ConcurrentLinkedQueue<String> messageQueue = new ConcurrentLinkedQueue<>();

    // Endpoint to retrieve messages
    @GetMapping("/consume")
    public ResponseEntity<Map<String, Object>> getMessage() {
        Map<String, Object> response = new HashMap<>();

        String message = messageQueue.poll();
        response.put("message", message);
        
        return ResponseEntity.ok(response);
    }

    // This method should be called when a JMS message is received
    public static void storeMessage(String message) {
        messageQueue.add(message);
    }
}
