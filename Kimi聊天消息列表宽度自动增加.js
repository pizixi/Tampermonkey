// ==UserScript==
// @name         Kimi聊天消息列表宽度自动增加
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动增加Kimi聊天页面的消息列表宽度并居中显示，滚动条在最右侧，不影响左侧菜单和鼠标悬浮事件
// @author       You
// @match        https://kimi.moonshot.cn/*
// @match        https://www.kimi.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                    return;
                }
                
                setTimeout(check, 100);
            }
            
            check();
        });
    }

    // 添加自定义CSS样式
    function addCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 只针对右侧聊天区域，不影响左侧菜单和鼠标悬浮事件 */
            /* 聊天主容器居中显示 - 使用更精确的选择器避免影响悬浮事件 */
            [class*="chat-main"]:not([class*="sidebar"]):not([class*="menu"]),
            [class*="conversation-main"]:not([class*="sidebar"]):not([class*="menu"]),
            [class*="chat-content"]:not([class*="sidebar"]):not([class*="menu"]),
            [class*="message-container"]:not([class*="sidebar"]):not([class*="menu"]) {
                max-width: 90% !important;
                margin: 0 auto !important;
                padding: 0 20px !important;
                /* 保持原有的事件处理 */
                pointer-events: auto !important;
            }

            /* 聊天消息列表容器 - 确保不影响子元素的事件 */
            [class*="message-list"],
            [class*="chat-messages"],
            [class*="conversation-content"] {
                max-width: 100% !important;
                width: 100% !important;
                margin: 0 auto !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                /* 保持子元素的事件处理 */
                pointer-events: auto !important;
            }

            /* 确保滚动条在最右侧 */
            [class*="message-list"]::-webkit-scrollbar,
            [class*="chat-messages"]::-webkit-scrollbar,
            [class*="conversation-content"]::-webkit-scrollbar {
                width: 8px !important;
            }

            /* 单个消息气泡 - 明确保持所有交互事件 */
            [class*="message-bubble"],
            [class*="chat-bubble"],
            [class*="message-item"] {
                max-width: 85% !important;
                /* 确保悬浮、点击等事件正常工作 */
                pointer-events: auto !important;
                position: relative !important;
            }

            /* 消息内的所有交互元素保持事件 */
            [class*="message-bubble"] *,
            [class*="chat-bubble"] *,
            [class*="message-item"] * {
                pointer-events: auto !important;
            }

            /* 右侧主要内容区域，排除侧边栏 */
            main:not([class*="sidebar"]):not([class*="menu"]),
            [role="main"]:not([class*="sidebar"]):not([class*="menu"]),
            .main-content:not([class*="sidebar"]):not([class*="menu"]) {
                max-width: 90% !important;
                margin: 0 auto !important;
                /* 保持事件传递 */
                pointer-events: auto !important;
            }

            /* 确保左侧菜单和所有交互元素不受影响 */
            [class*="sidebar"],
            [class*="menu"],
            [class*="nav"],
            aside,
            button,
            [role="button"],
            a,
            input,
            textarea,
            select {
                max-width: initial !important;
                width: initial !important;
                margin: initial !important;
                pointer-events: auto !important;
            }

            /* 针对可能的flex布局容器 */
            .flex-1:not([class*="sidebar"]):not([class*="menu"]) {
                max-width: 90% !important;
                margin: 0 auto !important;
                pointer-events: auto !important;
            }

            /* 特别保护悬浮工具栏和操作按钮 */
            [class*="hover"],
            [class*="tooltip"],
            [class*="dropdown"],
            [class*="popup"],
            [class*="action"],
            [class*="toolbar"],
            [class*="copy"],
            [class*="edit"],
            [class*="delete"],
            [class*="reply"],
            [class*="option"],
            [class*="control"] {
                pointer-events: auto !important;
                position: relative !important;
                z-index: 9999 !important;
            }

            /* 确保消息悬浮操作栏正常显示 */
            [class*="message"]:hover [class*="action"],
            [class*="message"]:hover [class*="toolbar"],
            [class*="message"]:hover [class*="option"] {
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
            }
        `;
        document.head.appendChild(style);
        console.log('Kimi聊天区域居中样式已添加');
    }

    // 动态调整聊天区域宽度和居中，保护所有事件处理
    function adjustElementWidths() {
        // 只针对聊天相关容器，排除侧边栏和菜单
        const chatSelectors = [
            '[class*="chat-main"]:not([class*="sidebar"]):not([class*="menu"])',
            '[class*="conversation-main"]:not([class*="sidebar"]):not([class*="menu"])',
            '[class*="chat-content"]:not([class*="sidebar"]):not([class*="menu"])',
            '[class*="message-container"]:not([class*="sidebar"]):not([class*="menu"])',
            'main:not([class*="sidebar"]):not([class*="menu"])',
            '[role="main"]:not([class*="sidebar"]):not([class*="menu"])'
        ];

        chatSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // 检查是否是侧边栏或菜单元素
                const classList = element.className.toLowerCase();
                if (classList.includes('sidebar') || classList.includes('menu') || classList.includes('nav')) {
                    return; // 跳过侧边栏和菜单元素
                }

                const computedStyle = window.getComputedStyle(element);
                const maxWidth = computedStyle.maxWidth;

                // 如果元素有较小的最大宽度限制，则扩大并居中
                if (maxWidth && maxWidth !== 'none' && parseInt(maxWidth) < window.innerWidth * 0.85) {
                    element.style.maxWidth = '90%';
                    element.style.margin = '0 auto';
                    element.style.padding = '0 20px';
                    // 确保事件处理正常
                    element.style.pointerEvents = 'auto';
                }
            });
        });

        // 特别处理消息列表滚动条
        const messageListSelectors = [
            '[class*="message-list"]',
            '[class*="chat-messages"]',
            '[class*="conversation-content"]'
        ];

        messageListSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.overflowX = 'hidden';
                element.style.overflowY = 'auto';
                // 确保消息列表内的事件正常
                element.style.pointerEvents = 'auto';
            });
        });

        // 保护所有交互元素的事件处理
        preserveEventHandlers();
    }

    // 保护事件处理器的函数
    function preserveEventHandlers() {
        // 确保所有交互元素的pointer-events属性正确
        const interactiveSelectors = [
            'button', '[role="button"]', 'a', 'input', 'textarea', 'select',
            '[class*="hover"]', '[class*="tooltip"]', '[class*="dropdown"]',
            '[class*="popup"]', '[class*="action"]', '[class*="toolbar"]',
            '[class*="message-bubble"]', '[class*="chat-bubble"]', '[class*="message-item"]',
            '[class*="copy"]', '[class*="edit"]', '[class*="delete"]', '[class*="reply"]',
            '[class*="menu"]', '[class*="option"]', '[class*="control"]'
        ];

        interactiveSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // 确保元素可以接收事件
                if (element.style.pointerEvents === 'none') {
                    element.style.pointerEvents = 'auto';
                }
                // 确保元素有正确的位置属性以支持悬浮效果
                if (window.getComputedStyle(element).position === 'static') {
                    element.style.position = 'relative';
                }
            });
        });
    }

    // 监听DOM变化，确保样式持续生效且不影响事件
    function observeChanges() {
        const observer = new MutationObserver((mutations) => {
            let shouldAdjust = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 检查是否有新的聊天消息或页面结构变化
                    const addedNodes = Array.from(mutation.addedNodes);
                    if (addedNodes.some(node =>
                        node.nodeType === 1 && (
                            node.matches && (
                                node.matches('[class*="message"]') ||
                                node.matches('[class*="chat"]') ||
                                node.matches('[class*="conversation"]') ||
                                node.querySelector('[class*="message"]') ||
                                node.querySelector('[class*="chat"]') ||
                                node.querySelector('[class*="conversation"]')
                            )
                        )
                    )) {
                        shouldAdjust = true;
                    }
                }
            });

            if (shouldAdjust) {
                // 延迟调整，确保DOM完全加载且不干扰事件绑定
                setTimeout(() => {
                    adjustElementWidths();
                }, 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('DOM变化监听器已启动');
    }

    // 主函数
    async function init() {
        try {
            // 立即添加样式
            addCustomStyles();
            
            // 等待页面基本加载
            await new Promise(resolve => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });
            
            // 初始调整
            adjustElementWidths();
            
            // 启动监听器
            observeChanges();
            
            // 定期检查和调整，但频率降低以减少性能影响
            setInterval(() => {
                adjustElementWidths();
                preserveEventHandlers();
            }, 3000);
            
            console.log('Kimi聊天区域居中扩展脚本已启动');
            
        } catch (error) {
            console.error('Kimi宽度扩展脚本初始化失败:', error);
        }
    }

    // 启动脚本
    init();

})();
