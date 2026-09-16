package com.scct.dxs.pushtest;

import java.net.URI;
import java.net.URISyntaxException;

/** Shared check for top-level navigation and every bridge call, including its source frame. */
final class TrustedOrigin {
    private final URI origin;

    TrustedOrigin(String value) {
        origin = URI.create(value);
        if (!"https".equals(origin.getScheme()) || origin.getHost() == null ||
            origin.getUserInfo() != null || origin.getQuery() != null ||
            origin.getFragment() != null || !origin.getPath().isEmpty()) {
            throw new IllegalArgumentException("HTTPS 서버 주소를 확인해 주세요.");
        }
    }

    boolean matches(String value) {
        if (value == null) return false;
        try {
            URI candidate = new URI(value);
            return "https".equalsIgnoreCase(candidate.getScheme()) &&
                origin.getHost().equalsIgnoreCase(candidate.getHost()) &&
                candidate.getUserInfo() == null &&
                port(origin) == port(candidate);
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    private static int port(URI uri) {
        return uri.getPort() == -1 ? 443 : uri.getPort();
    }
}
