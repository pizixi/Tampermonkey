// ==UserScript==
// @name         Arena.ai Markdown代码块自动折叠
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  在 arena.ai 页面中自动折叠 Markdown 代码块，并支持一键展开/折叠。
// @author       You
// @match        *://arena.ai/*
// @match        *://*.arena.ai/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        minLinesToFold: 8,
        collapsedMaxHeight: 180,
        observerDebounceMs: 120
    };

    const STYLE_ID = 'tm-arena-code-fold-style';
    const WRAP_CLASS = 'tm-arena-code-wrap';
    const PRE_CLASS = 'tm-arena-code-pre';
    const COLLAPSED_CLASS = 'tm-arena-code-collapsed';
    const FADE_CLASS = 'tm-arena-code-fade';
    const BTN_CLASS = 'tm-arena-code-toggle';
    const META_CLASS = 'tm-arena-code-meta';
    const FLAG = 'tmArenaCodeFoldApplied';

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .${WRAP_CLASS} {
                position: relative;
                margin: 10px 0;
            }
            .${META_CLASS} {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
                font-size: 12px;
                color: #666;
            }
            .${BTN_CLASS} {
                border: 1px solid rgba(0, 0, 0, 0.15);
                background: #fff;
                color: #333;
                border-radius: 6px;
                padding: 2px 8px;
                cursor: pointer;
                font-size: 12px;
                line-height: 1.4;
            }
            .${BTN_CLASS}:hover {
                background: #f5f5f5;
            }
            .${PRE_CLASS} {
                transition: max-height 0.2s ease;
                overflow: auto;
                position: relative;
                max-height: none;
            }
            .${PRE_CLASS}.${COLLAPSED_CLASS} {
                max-height: ${CONFIG.collapsedMaxHeight}px !important;
                overflow: hidden;
            }
            .${FADE_CLASS} {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: 42px;
                pointer-events: none;
                background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.92));
            }
            .${PRE_CLASS}:not(.${COLLAPSED_CLASS}) + .${FADE_CLASS} {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }

    function getCodeLineCount(pre) {
        const code = pre.querySelector('code');
        if (!code) return 0;
        const text = code.textContent || '';
        return text.split('\n').length;
    }

    function createMetaBar(lineCount) {
        const meta = document.createElement('div');
        meta.className = META_CLASS;

        const label = document.createElement('span');
        label.textContent = `代码块 ${lineCount} 行`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = BTN_CLASS;
        btn.textContent = '展开代码';

        meta.appendChild(label);
        meta.appendChild(btn);
        return { meta, btn };
    }

    function setCollapsedState(pre, btn, collapsed) {
        pre.classList.toggle(COLLAPSED_CLASS, collapsed);
        btn.textContent = collapsed ? '展开代码' : '折叠代码';
    }

    function enhancePre(pre) {
        if (!pre || pre.dataset[FLAG] === '1') return;
        if (pre.closest(`.${WRAP_CLASS}`)) return;
        if (!pre.querySelector('code')) return;

        const lineCount = getCodeLineCount(pre);
        if (lineCount < CONFIG.minLinesToFold) return;

        const wrapper = document.createElement('div');
        wrapper.className = WRAP_CLASS;

        const { meta, btn } = createMetaBar(lineCount);
        const fade = document.createElement('div');
        fade.className = FADE_CLASS;

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(meta);
        wrapper.appendChild(pre);
        wrapper.appendChild(fade);

        pre.classList.add(PRE_CLASS);
        setCollapsedState(pre, btn, true);

        btn.addEventListener('click', () => {
            const collapsed = pre.classList.contains(COLLAPSED_CLASS);
            setCollapsedState(pre, btn, !collapsed);
        });

        pre.dataset[FLAG] = '1';
    }

    function scan(root = document) {
        const list = root.querySelectorAll('pre');
        list.forEach(enhancePre);
    }

    function initObserver() {
        let timer = null;
        const observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }
            if (!shouldScan) return;
            clearTimeout(timer);
            timer = setTimeout(() => scan(document), CONFIG.observerDebounceMs);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function init() {
        injectStyles();
        scan(document);
        initObserver();
        console.log('[TM] Arena.ai Markdown代码块自动折叠已启用');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
