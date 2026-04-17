package kz.qamqor.controller;

import kz.qamqor.dto.response.UserDto;
import kz.qamqor.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserDto>> list(@RequestParam(required = false) String role) {
        if (role != null) {
            return ResponseEntity.ok(userService.getByRole(role));
        }
        return ResponseEntity.ok(userService.getByRole("volunteer"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getById(id));
    }
}
