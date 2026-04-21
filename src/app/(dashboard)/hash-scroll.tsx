"use client";

import { useEffect } from "react";

// ダッシュボードレイアウトでは `<main>` がスクロールコンテナになっており、
// document は伸びないのでブラウザ標準のハッシュナビゲーションが効かない。
// 初期ロードとハッシュ変更時に明示的に scrollIntoView を呼び、
// /ticker/{ticker}#analysis-{id} のようなディープリンクを機能させる。
export function HashScroll() {
  useEffect(() => {
    const scrollToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      // レンダリング直後の測定を安定させるため次フレームで実行
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
      });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return null;
}
