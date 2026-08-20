"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const ScctDevPage = () => {
  const pathname = usePathname();
  const router = useRouter();

  // 1. 루트 경로('/')로 들어오면 강제로 운송관리 페이지로 보냄
  useEffect(() => {
    if (pathname === '/' || pathname === '') {
      router.replace('/master-dashboard');
    }
  }, [pathname, router]);
  return (
    <div/>
  );
};

export default ScctDevPage;