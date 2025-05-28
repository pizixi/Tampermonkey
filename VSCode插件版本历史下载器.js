// ==UserScript==
// @name         VS Code插件版本历史下载器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在VS Code插件中心的版本历史页面添加.vsix文件下载链接
// @author       You
// @match        https://marketplace.visualstudio.com/items?itemName=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 获取插件信息
    function getExtensionInfo() {
        const url = window.location.href;
        const match = url.match(/itemName=([^&]+)/);
        if (!match) return null;
        
        const [publisher, extensionName] = match[1].split('.');
        return { publisher, extensionName };
    }

    // 创建下载链接
    function createDownloadLink(version, publisher, extensionName) {
        const downloadUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extensionName}/${version}/vspackage`;
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${extensionName}-${version}.vsix`;
        link.textContent = '下载.vsix';
        link.style.cssText = `
            display: inline-block;
            padding: 3px 8px;
            background-color: #0078d4;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            transition: background-color 0.2s;
            white-space: nowrap;
        `;
        
        link.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#106ebe';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#0078d4';
        });
        
        return link;
    }

    // 添加下载链接到版本历史
    function addDownloadLinks() {
        const extensionInfo = getExtensionInfo();
        if (!extensionInfo) {
            console.log('无法获取插件信息');
            return;
        }

        const { publisher, extensionName } = extensionInfo;
        
        // 查找版本表格行
        const versionRows = document.querySelectorAll('tbody tr, .version-row, .version-item');
        
        console.log(`找到 ${versionRows.length} 个版本行`);

        versionRows.forEach(row => {
            // 避免重复添加
            if (row.querySelector('.download-vsix-link')) return;

            // 查找版本号单元格（通常是第一个单元格）
            const versionCell = row.querySelector('td:first-child, .version-number');
            if (!versionCell) return;

            // 更精确地提取版本号，避免包含日期
            const versionText = versionCell.textContent.trim();
            // 匹配标准的版本号格式，确保不包含其他内容
            const versionMatch = versionText.match(/^(\d+\.\d+\.\d+(?:\.\d+)?)$/);
            
            if (versionMatch) {
                const version = versionMatch[1];
                const downloadLink = createDownloadLink(version, publisher, extensionName);
                downloadLink.classList.add('download-vsix-link');
                
                // 查找日期列（通常是第二个单元格）
                const dateCell = row.querySelector('td:nth-child(2), .last-updated');
                
                if (dateCell) {
                    // 在日期列前面插入下载按钮
                    dateCell.style.position = 'relative';
                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.cssText = `
                        display: inline-block;
                        margin-right: 15px;
                        vertical-align: middle;
                    `;
                    buttonContainer.appendChild(downloadLink);
                    dateCell.insertBefore(buttonContainer, dateCell.firstChild);
                } else {
                    // 如果找不到日期列，就添加到版本号后面
                    versionCell.appendChild(downloadLink);
                }
                
                console.log(`为版本 ${version} 添加了下载链接`);
            } else {
                console.log(`版本号格式不匹配: "${versionText}"`);
            }
        });

        // 如果上面的方法没找到，尝试备用方法
        if (document.querySelectorAll('.download-vsix-link').length === 0) {
            console.log('使用备用方法查找版本');
            
            // 查找所有可能包含版本号的元素
            const allElements = document.querySelectorAll('*');
            const processedVersions = new Set();
            
            allElements.forEach(element => {
                const text = element.textContent?.trim();
                if (!text) return;
                
                // 精确匹配版本号格式
                const versionMatch = text.match(/^(\d+\.\d+\.\d+(?:\.\d+)?)$/);
                if (versionMatch && !processedVersions.has(versionMatch[1])) {
                    const version = versionMatch[1];
                    processedVersions.add(version);
                    
                    // 查找父容器
                    const container = element.closest('tr, .version-item, .version-row') || element.parentElement;
                    if (container && !container.querySelector('.download-vsix-link')) {
                        const downloadLink = createDownloadLink(version, publisher, extensionName);
                        downloadLink.classList.add('download-vsix-link');
                        element.appendChild(downloadLink);
                        console.log(`为版本 ${version} 添加了下载链接（备用方法）`);
                    }
                }
            });
        }
    }

    // 创建手动触发按钮
    function createTriggerButton() {
        const button = document.createElement('button');
        button.textContent = '添加下载链接';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 10px 15px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        
        button.addEventListener('click', function() {
            addDownloadLinks();
            this.textContent = '已添加下载链接';
            this.style.backgroundColor = '#6c757d';
            setTimeout(() => {
                this.remove();
            }, 2000);
        });
        
        document.body.appendChild(button);
    }

    // 页面加载完成后执行
    function init() {
        // 等待页面完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // 延迟执行，确保动态内容加载完成
        setTimeout(() => {
            addDownloadLinks();
            
            // 如果没有找到版本元素，显示手动触发按钮
            const hasDownloadLinks = document.querySelectorAll('.download-vsix-link').length > 0;
            if (!hasDownloadLinks) {
                createTriggerButton();
            }
        }, 2000);

        // 监听页面变化（处理SPA应用）
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldUpdate = true;
                }
            });
            
            if (shouldUpdate) {
                setTimeout(addDownloadLinks, 1000);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 启动脚本
    init();

    // 添加控制台命令，方便调试
    window.addVSCodeDownloadLinks = addDownloadLinks;
    console.log('VS Code插件版本历史下载器已加载');
    console.log('可以在控制台运行 addVSCodeDownloadLinks() 手动添加下载链接');
})();