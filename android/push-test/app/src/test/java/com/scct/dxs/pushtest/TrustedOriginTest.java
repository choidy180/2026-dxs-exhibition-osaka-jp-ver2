package com.scct.dxs.pushtest;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import org.junit.Test;

public final class TrustedOriginTest {
    private final TrustedOrigin origin = new TrustedOrigin("https://192.168.137.1:3000");

    @Test public void permitsInternalPagesOnTheExactOrigin() {
        assertTrue(origin.matches("https://192.168.137.1:3000/lab/push?native=android"));
        assertTrue(origin.matches("https://192.168.137.1:3000"));
    }

    @Test public void rejectsOtherHostsPortsAndSchemes() {
        assertFalse(origin.matches("https://192.168.137.2:3000/lab/push"));
        assertFalse(origin.matches("https://192.168.137.1/lab/push"));
        assertFalse(origin.matches("http://192.168.137.1:3000/lab/push"));
        assertFalse(origin.matches("javascript:alert(1)"));
        assertFalse(origin.matches("file:///lab/push"));
        assertFalse(origin.matches("intent://192.168.137.1:3000/lab/push"));
    }

    @Test public void rejectsSpoofedAndMalformedOrigins() {
        assertFalse(origin.matches("https://192.168.137.1:3000@evil.example/lab/push"));
        assertFalse(origin.matches("https://evil.example@192.168.137.1:3000/lab/push"));
        assertFalse(origin.matches("https://192.168.137.1.evil.example:3000/lab/push"));
        assertFalse(origin.matches("https://192.168.137.1:3000\\@evil.example"));
        assertFalse(origin.matches(null));
    }

    @Test public void treatsDefaultHttpsPortAsTheSameOrigin() {
        TrustedOrigin standard = new TrustedOrigin("https://internal.example");
        assertTrue(standard.matches("https://internal.example:443/lab/push"));
        assertFalse(standard.matches("https://internal.example:444/lab/push"));
    }
}
