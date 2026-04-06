(function() {
    'use strict';

    const SECTION_LAYOUTS = {
        single: { label: 'Story Column', columns: 1 },
        split: { label: '2 Column Split', columns: 2 },
        featureLeft: { label: 'Feature Left 60 / 40', columns: 2 },
        featureRight: { label: 'Feature Right 40 / 60', columns: 2 },
        triple: { label: '3 Column Grid', columns: 3 }
    };

    const SECTION_WIDTHS = {
        narrow: 'Reading Width',
        wide: 'Wide Breakout',
        full: 'Full Breakout'
    };

    const SECTION_SURFACES = {
        default: 'Plain',
        card: 'Card',
        muted: 'Muted',
        accent: 'Accent Glow'
    };

    const SECTION_GAPS = {
        compact: 'Compact',
        normal: 'Normal',
        loose: 'Spacious'
    };

    const BLOCK_DEFINITIONS = {
        header: { label: 'Heading', hint: 'Section title or eyebrow' },
        paragraph: { label: 'Paragraph', hint: 'Main story copy' },
        image: { label: 'Image', hint: 'Upload media with sizing' },
        list: { label: 'List', hint: 'Bullets or numbered steps' },
        quote: { label: 'Quote', hint: 'Pull quote or testimonial' },
        callout: { label: 'Callout', hint: 'Highlight key ideas' },
        button: { label: 'Button', hint: 'Primary call to action' },
        embed: { label: 'Embed', hint: 'Video or media URL' },
        code: { label: 'Code', hint: 'Preformatted snippet' },
        delimiter: { label: 'Divider', hint: 'Visual section break' }
    };

    const BLOCK_ORDER = ['header', 'paragraph', 'image', 'list', 'quote', 'callout', 'button', 'embed', 'code', 'delimiter'];
    const IMAGE_SIZES = { small: 'Small', medium: 'Medium', large: 'Large', full: 'Full Width' };
    const BUTTON_STYLES = { solid: 'Solid', outline: 'Outline', ghost: 'Ghost' };
    const BUTTON_ALIGNMENTS = { left: 'Left', center: 'Center', right: 'Right' };
    const CALLOUT_TONES = { accent: 'Accent', info: 'Info', success: 'Success', warning: 'Warning' };
    const RICH_COMMANDS = [
        { command: 'bold', label: 'B', title: 'Bold' },
        { command: 'italic', label: 'I', title: 'Italic' },
        { command: 'underline', label: 'U', title: 'Underline' },
        { command: 'createLink', label: 'Link', title: 'Add link' },
        { command: 'removeFormat', label: 'Clear', title: 'Clear formatting' }
    ];

    function esc(value) {
        const div = document.createElement('div');
        div.textContent = value || '';
        return div.innerHTML;
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function cleanRichTextHtml(html) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = String(html || '')
            .replace(/<div><br><\/div>/gi, '<br>')
            .replace(/<div>/gi, '<br>')
            .replace(/<\/div>/gi, '')
            .replace(/&nbsp;/gi, ' ');

        wrapper.querySelectorAll('script,style,iframe,object,embed').forEach(node => node.remove());
        wrapper.querySelectorAll('*').forEach(node => {
            const tag = node.tagName.toUpperCase();
            if (!['A', 'B', 'STRONG', 'I', 'EM', 'U', 'MARK', 'CODE', 'BR'].includes(tag)) {
                const fragment = document.createDocumentFragment();
                while (node.firstChild) fragment.appendChild(node.firstChild);
                node.replaceWith(fragment);
                return;
            }

            const href = tag === 'A' ? (node.getAttribute('href') || '').trim() : '';
            [...node.attributes].forEach(attr => node.removeAttribute(attr.name));
            if (tag === 'A' && /^(https?:|mailto:|tel:)/i.test(href)) {
                node.setAttribute('href', href);
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
        });

        return wrapper.innerHTML.trim();
    }

    function plainText(value) {
        const div = document.createElement('div');
        div.innerHTML = value || '';
        return (div.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function hasRichContent(value) {
        return plainText(cleanRichTextHtml(value)).length > 0;
    }

    function clampHeadingLevel(value) {
        const level = Number(value) || 2;
        return Math.min(Math.max(level, 2), 4);
    }

    function normalizeImageSize(value, stretched) {
        return Object.prototype.hasOwnProperty.call(IMAGE_SIZES, value)
            ? value
            : (stretched ? 'full' : 'large');
    }

    function normalizeEmbedUrl(value) {
        const url = String(value || '').trim();
        if (!url) return '';

        try {
            const parsed = new URL(url);
            const host = parsed.hostname.replace(/^www\./, '');

            if (host === 'youtu.be') {
                const id = parsed.pathname.split('/').filter(Boolean)[0];
                return id ? `https://www.youtube.com/embed/${id}` : url;
            }

            if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
                if (parsed.pathname === '/watch' && parsed.searchParams.get('v')) {
                    return `https://www.youtube.com/embed/${parsed.searchParams.get('v')}`;
                }
                if (parsed.pathname.startsWith('/shorts/')) {
                    const id = parsed.pathname.split('/')[2];
                    return id ? `https://www.youtube.com/embed/${id}` : url;
                }
                if (parsed.pathname.startsWith('/embed/')) return parsed.toString();
            }

            if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
                const id = parsed.pathname.split('/').filter(Boolean)[0];
                return id ? `https://player.vimeo.com/video/${id}` : url;
            }
        } catch (_) {
            return url;
        }

        return url;
    }

    function normalizeExternalUrl(value) {
        const url = String(value || '').trim();
        if (!url) return '';
        if (/^(https?:|mailto:|tel:|data:|blob:)/i.test(url)) return url;
        if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) return `https://${url}`;
        return url;
    }

    function getLayoutColumnCount(layout) {
        return SECTION_LAYOUTS[layout]?.columns || 1;
    }

    function createDefaultBlock(type = 'paragraph') {
        switch (type) {
            case 'header': return { type: 'header', data: { text: '', level: 2 } };
            case 'image': return { type: 'image', data: { url: '', caption: '', size: 'large', withBorder: false, withBackground: false } };
            case 'list': return { type: 'list', data: { style: 'unordered', items: [] } };
            case 'quote': return { type: 'quote', data: { text: '', caption: '' } };
            case 'callout': return { type: 'callout', data: { title: '', text: '', tone: 'accent' } };
            case 'button': return { type: 'button', data: { text: 'Learn More', url: '', style: 'solid', align: 'left' } };
            case 'embed': return { type: 'embed', data: { url: '', caption: '' } };
            case 'code': return { type: 'code', data: { code: '' } };
            case 'delimiter': return { type: 'delimiter', data: {} };
            default: return { type: 'paragraph', data: { text: '' } };
        }
    }

    function createDefaultSection(layout = 'single') {
        const columns = Array.from({ length: getLayoutColumnCount(layout) }, () => ({ blocks: [] }));
        return {
            type: 'section',
            data: {
                layout,
                width: 'wide',
                surface: 'default',
                gap: 'normal',
                columns
            }
        };
    }

    function normalizeListItems(items) {
        return (Array.isArray(items) ? items : [])
            .map(item => typeof item === 'string' ? plainText(item) : plainText(item?.content || ''))
            .filter(Boolean);
    }

    function normalizeBlock(block) {
        if (!block || !block.type) return null;
        const data = block.data || {};

        switch (block.type) {
            case 'header':
                return { type: 'header', data: { text: cleanRichTextHtml(data.text || ''), level: clampHeadingLevel(data.level) } };
            case 'paragraph':
                return { type: 'paragraph', data: { text: cleanRichTextHtml(data.text || '') } };
            case 'image':
                return {
                    type: 'image',
                    data: {
                        url: String(data.file?.url || data.url || '').trim(),
                        caption: plainText(data.caption || ''),
                        size: normalizeImageSize(data.size, data.stretched),
                        withBorder: !!data.withBorder,
                        withBackground: !!data.withBackground
                    }
                };
            case 'list':
                return { type: 'list', data: { style: data.style === 'ordered' ? 'ordered' : 'unordered', items: normalizeListItems(data.items) } };
            case 'quote':
                return { type: 'quote', data: { text: cleanRichTextHtml(data.text || ''), caption: plainText(data.caption || '') } };
            case 'callout':
                return {
                    type: 'callout',
                    data: {
                        title: plainText(data.title || ''),
                        text: cleanRichTextHtml(data.text || ''),
                        tone: Object.prototype.hasOwnProperty.call(CALLOUT_TONES, data.tone) ? data.tone : 'accent'
                    }
                };
            case 'button':
                return {
                    type: 'button',
                    data: {
                        text: plainText(data.text || ''),
                        url: normalizeExternalUrl(data.url || ''),
                        style: Object.prototype.hasOwnProperty.call(BUTTON_STYLES, data.style) ? data.style : 'solid',
                        align: Object.prototype.hasOwnProperty.call(BUTTON_ALIGNMENTS, data.align) ? data.align : 'left'
                    }
                };
            case 'embed':
                return { type: 'embed', data: { url: normalizeEmbedUrl(data.embed || data.url || ''), caption: plainText(data.caption || '') } };
            case 'code':
                return { type: 'code', data: { code: String(data.code || '') } };
            case 'delimiter':
                return { type: 'delimiter', data: {} };
            default:
                if (data.text) return { type: 'paragraph', data: { text: cleanRichTextHtml(data.text) } };
                return null;
        }
    }

    function normalizeColumn(column) {
        return {
            blocks: (Array.isArray(column?.blocks) ? column.blocks : []).map(normalizeBlock).filter(Boolean)
        };
    }

    function reflowColumns(columns, targetCount) {
        const next = (Array.isArray(columns) ? columns : []).map(normalizeColumn);
        while (next.length < targetCount) next.push({ blocks: [] });
        if (next.length > targetCount) {
            const kept = next.slice(0, targetCount);
            const overflow = next.slice(targetCount).flatMap(column => column.blocks || []);
            kept[targetCount - 1].blocks.push(...overflow);
            return kept;
        }
        return next;
    }

    function normalizeSection(section) {
        const data = section?.data || section || {};
        const layout = Object.prototype.hasOwnProperty.call(SECTION_LAYOUTS, data.layout) ? data.layout : 'single';
        return {
            type: 'section',
            data: {
                layout,
                width: Object.prototype.hasOwnProperty.call(SECTION_WIDTHS, data.width) ? data.width : 'wide',
                surface: Object.prototype.hasOwnProperty.call(SECTION_SURFACES, data.surface) ? data.surface : 'default',
                gap: Object.prototype.hasOwnProperty.call(SECTION_GAPS, data.gap) ? data.gap : 'normal',
                columns: reflowColumns(data.columns, getLayoutColumnCount(layout))
            }
        };
    }

    function wrapLegacyBlocks(blocks) {
        const section = createDefaultSection('single');
        section.data.width = 'narrow';
        section.data.columns[0].blocks = blocks.length ? blocks : [createDefaultBlock('paragraph')];
        return normalizeSection(section);
    }

    function parseContent(value) {
        if (!value) return [createDefaultSection('single')];

        let parsed = value;
        if (typeof value === 'string') {
            try {
                parsed = JSON.parse(value);
            } catch (_) {
                return [wrapLegacyBlocks([{ type: 'paragraph', data: { text: cleanRichTextHtml(value) } }])];
            }
        }

        const rawBlocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
        if (!rawBlocks.length) return [createDefaultSection('single')];

        const normalized = rawBlocks.map(item => item?.type === 'section' ? normalizeSection(item) : normalizeBlock(item)).filter(Boolean);
        if (!normalized.length) return [createDefaultSection('single')];
        if (!normalized.some(item => item.type === 'section')) return [wrapLegacyBlocks(normalized)];

        const sections = [];
        let buffer = [];
        normalized.forEach(item => {
            if (item.type === 'section') {
                if (buffer.length) sections.push(wrapLegacyBlocks(buffer));
                buffer = [];
                sections.push(item);
                return;
            }
            buffer.push(item);
        });
        if (buffer.length) sections.push(wrapLegacyBlocks(buffer));
        return sections.length ? sections : [createDefaultSection('single')];
    }

    function isBlockMeaningful(block) {
        const data = block?.data || {};
        switch (block?.type) {
            case 'header': return hasRichContent(data.text);
            case 'paragraph': return hasRichContent(data.text);
            case 'image': return !!String(data.url || '').trim();
            case 'list': return normalizeListItems(data.items).length > 0;
            case 'quote': return hasRichContent(data.text) || !!plainText(data.caption || '');
            case 'callout': return !!plainText(data.title || '') || hasRichContent(data.text);
            case 'button': return !!plainText(data.text || '') && !!String(data.url || '').trim();
            case 'embed': return !!String(data.url || '').trim();
            case 'code': return !!String(data.code || '').trim();
            case 'delimiter': return true;
            default: return false;
        }
    }

    function optionMarkup(options, currentValue) {
        return Object.entries(options).map(([value, meta]) => {
            const label = typeof meta === 'string' ? meta : meta.label;
            return `<option value="${esc(value)}"${value === currentValue ? ' selected' : ''}>${esc(label)}</option>`;
        }).join('');
    }

    function richToolbarMarkup() {
        return RICH_COMMANDS.map(item => `
            <button type="button" class="layout-rich-toolbar__btn" data-rich-command="${item.command}" title="${esc(item.title)}">${esc(item.label)}</button>
        `).join('');
    }

    class KaizenBlogEditor {
        constructor({ holder, data, uploadImage, showToast } = {}) {
            this.holder = typeof holder === 'string' ? document.getElementById(holder) : holder;
            if (!this.holder) throw new Error('Editor mount element was not found.');

            this.uploadImage = typeof uploadImage === 'function' ? uploadImage : null;
            this.showToast = typeof showToast === 'function' ? showToast : () => {};
            this.sections = parseContent(data);
            this.pendingImageTarget = null;

            this.handleMouseDown = this.handleMouseDown.bind(this);
            this.handleClick = this.handleClick.bind(this);
            this.handleInput = this.handleInput.bind(this);
            this.handleChange = this.handleChange.bind(this);
            this.handleBlur = this.handleBlur.bind(this);

            this.holder.addEventListener('mousedown', this.handleMouseDown);
            this.holder.addEventListener('click', this.handleClick);
            this.holder.addEventListener('input', this.handleInput);
            this.holder.addEventListener('change', this.handleChange);
            this.holder.addEventListener('blur', this.handleBlur, true);

            this.render();
        }

        destroy() {
            this.holder.removeEventListener('mousedown', this.handleMouseDown);
            this.holder.removeEventListener('click', this.handleClick);
            this.holder.removeEventListener('input', this.handleInput);
            this.holder.removeEventListener('change', this.handleChange);
            this.holder.removeEventListener('blur', this.handleBlur, true);
            this.holder.innerHTML = '';
        }

        ensureSections() {
            if (!this.sections.length) this.sections = [createDefaultSection('single')];
        }

        getSection(sectionIndex) {
            return this.sections[sectionIndex] || null;
        }

        getColumn(sectionIndex, columnIndex) {
            return this.getSection(sectionIndex)?.data?.columns?.[columnIndex] || null;
        }

        getBlock(sectionIndex, columnIndex, blockIndex) {
            return this.getColumn(sectionIndex, columnIndex)?.blocks?.[blockIndex] || null;
        }

        sectionAttrs(sectionIndex, field, kind = 'text') {
            return `data-target="section" data-section="${sectionIndex}" data-field="${field}" data-kind="${kind}"`;
        }

        blockAttrs(sectionIndex, columnIndex, blockIndex, field, kind = 'text') {
            return `data-target="block" data-section="${sectionIndex}" data-column="${columnIndex}" data-block="${blockIndex}" data-field="${field}" data-kind="${kind}"`;
        }

        renderSectionTemplateButtons(action, sectionIndex = null) {
            return Object.entries(SECTION_LAYOUTS).map(([layout, meta]) => `
                <button type="button" class="layout-pill" data-action="${action}" data-layout="${layout}"${sectionIndex === null ? '' : ` data-section="${sectionIndex}"`}>
                    ${esc(meta.label)}
                </button>
            `).join('');
        }

        render() {
            this.ensureSections();
            this.holder.innerHTML = `
                <div class="layout-editor">
                    <div class="layout-editor__top">
                        <div>
                            <span class="layout-eyebrow">Kaizen Layout Editor</span>
                            <h3>Build posts with sections, columns, and styled blocks.</h3>
                            <p>Create story sections, feature splits, wide breakouts, callouts, CTAs, and embeds. Existing blog content is still supported and gets wrapped into sections automatically.</p>
                        </div>
                        <div class="layout-launchpad">
                            <span class="layout-eyebrow">Add Section</span>
                            <div class="layout-pill-row">${this.renderSectionTemplateButtons('append-section')}</div>
                        </div>
                    </div>
                    <div class="layout-editor__stack">
                        ${this.sections.map((section, sectionIndex) => this.renderSection(section, sectionIndex)).join('')}
                    </div>
                    <input type="file" hidden accept="image/*" data-role="image-picker">
                </div>
            `;
        }

        renderSection(section, sectionIndex) {
            const data = normalizeSection(section).data;
            const blockCount = data.columns.reduce((sum, column) => sum + column.blocks.length, 0);
            const layoutLabel = SECTION_LAYOUTS[data.layout]?.label || 'Section';
            return `
                <section class="layout-section-card layout-section-card--surface-${data.surface}">
                    <div class="layout-section-card__header">
                        <div>
                            <span class="layout-eyebrow">Section ${sectionIndex + 1}</span>
                            <h4>${esc(layoutLabel)}</h4>
                            <p>${blockCount} ${blockCount === 1 ? 'block' : 'blocks'} across ${data.columns.length} ${data.columns.length === 1 ? 'column' : 'columns'}</p>
                        </div>
                        <div class="layout-inline-actions">
                            <button type="button" class="layout-action" data-action="move-section-up" data-section="${sectionIndex}" title="Move section up">Up</button>
                            <button type="button" class="layout-action" data-action="move-section-down" data-section="${sectionIndex}" title="Move section down">Down</button>
                            <button type="button" class="layout-action" data-action="duplicate-section" data-section="${sectionIndex}" title="Duplicate section">Duplicate</button>
                            <button type="button" class="layout-action layout-action--danger" data-action="delete-section" data-section="${sectionIndex}" title="Delete section">Delete</button>
                        </div>
                    </div>
                    <div class="layout-grid layout-grid--four layout-section-controls">
                        ${this.renderSelectField('Layout', this.sectionAttrs(sectionIndex, 'layout', 'select'), data.layout, SECTION_LAYOUTS)}
                        ${this.renderSelectField('Width', this.sectionAttrs(sectionIndex, 'width', 'select'), data.width, SECTION_WIDTHS)}
                        ${this.renderSelectField('Surface', this.sectionAttrs(sectionIndex, 'surface', 'select'), data.surface, SECTION_SURFACES)}
                        ${this.renderSelectField('Spacing', this.sectionAttrs(sectionIndex, 'gap', 'select'), data.gap, SECTION_GAPS)}
                    </div>
                    <div class="layout-section-grid layout-section-grid--${data.layout} layout-section-grid--gap-${data.gap}">
                        ${data.columns.map((column, columnIndex) => this.renderColumn(sectionIndex, columnIndex, column)).join('')}
                    </div>
                    <div class="layout-section-card__footer">
                        <span class="layout-eyebrow">Insert another section below</span>
                        <div class="layout-pill-row">${this.renderSectionTemplateButtons('insert-section-after', sectionIndex)}</div>
                    </div>
                </section>
            `;
        }

        renderColumn(sectionIndex, columnIndex, column) {
            const blocks = Array.isArray(column?.blocks) ? column.blocks : [];
            return `
                <div class="layout-column-card">
                    <div class="layout-column-card__header">
                        <strong>Column ${columnIndex + 1}</strong>
                        <span>${blocks.length ? `${blocks.length} blocks` : 'Empty column'}</span>
                    </div>
                    <div class="layout-column-card__stack">
                        ${blocks.length
                            ? blocks.map((block, blockIndex) => this.renderBlock(block, sectionIndex, columnIndex, blockIndex)).join('')
                            : `<div class="layout-empty-state"><strong>Empty column</strong><p>Add a heading, paragraph, image, CTA, or embed to start shaping this part of the article.</p></div>`}
                    </div>
                    <div class="layout-column-card__composer">
                        <span class="layout-eyebrow">Add Block</span>
                        <div class="layout-pill-row">
                            ${BLOCK_ORDER.map(type => `
                                <button type="button" class="layout-pill layout-pill--block" data-action="add-block" data-section="${sectionIndex}" data-column="${columnIndex}" data-block-type="${type}">
                                    ${esc(BLOCK_DEFINITIONS[type].label)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        renderBlock(block, sectionIndex, columnIndex, blockIndex) {
            const meta = BLOCK_DEFINITIONS[block.type] || { label: 'Block', hint: '' };
            const showHorizontalMove = this.getSection(sectionIndex)?.data?.columns?.length > 1;
            return `
                <article class="layout-block-card layout-block-card--${block.type}">
                    <div class="layout-block-card__header">
                        <div>
                            <span class="layout-chip">${esc(meta.label)}</span>
                            <span class="layout-block-card__hint">${esc(meta.hint)}</span>
                        </div>
                        <div class="layout-inline-actions">
                            <button type="button" class="layout-action" data-action="move-block-up" data-section="${sectionIndex}" data-column="${columnIndex}" data-block="${blockIndex}" title="Move block up">Up</button>
                            <button type="button" class="layout-action" data-action="move-block-down" data-section="${sectionIndex}" data-column="${columnIndex}" data-block="${blockIndex}" title="Move block down">Down</button>
                            ${showHorizontalMove ? `<button type="button" class="layout-action" data-action="move-block-left" data-section="${sectionIndex}" data-column="${columnIndex}" data-block="${blockIndex}" title="Move block left">Left</button>` : ''}
                            ${showHorizontalMove ? `<button type="button" class="layout-action" data-action="move-block-right" data-section="${sectionIndex}" data-column="${columnIndex}" data-block="${blockIndex}" title="Move block right">Right</button>` : ''}
                            <button type="button" class="layout-action" data-action="duplicate-block" data-section="${sectionIndex}" data-column="${columnIndex}" data-block="${blockIndex}" title="Duplicate block">Duplicate</button>
                            <button type="button" class="layout-action layout-action--danger" data-action="delete-block" data-section="${sectionIndex}" data-column="${columnIndex}" data-block="${blockIndex}" title="Delete block">Delete</button>
                        </div>
                    </div>
                    <div class="layout-block-card__body">
                        ${this.renderBlockBody(block, sectionIndex, columnIndex, blockIndex)}
                    </div>
                </article>
            `;
        }
        renderBlockBody(block, sectionIndex, columnIndex, blockIndex) {
            const attrs = (field, kind = 'text') => this.blockAttrs(sectionIndex, columnIndex, blockIndex, field, kind);
            const data = block.data || {};

            switch (block.type) {
                case 'header':
                    return `
                        <div class="layout-grid layout-grid--two">
                            <div class="layout-grid__span-2">
                                ${this.renderRichField('Heading Text', attrs('text', 'rich'), data.text || '', 'Type a section heading...', true)}
                            </div>
                            ${this.renderSelectField('Heading Level', attrs('level', 'select'), String(clampHeadingLevel(data.level)), { 2: 'H2', 3: 'H3', 4: 'H4' })}
                        </div>
                    `;

                case 'paragraph':
                    return this.renderRichField('Paragraph Copy', attrs('text', 'rich'), data.text || '', 'Write your paragraph here. Use the toolbar or keyboard shortcuts for emphasis.');

                case 'image':
                    return `
                        <div class="layout-grid layout-grid--two">
                            <div class="layout-grid__span-2">
                                ${this.renderInputField('Image URL', attrs('url', 'url'), data.url || '', 'Paste an image URL or upload a file')}
                            </div>
                            ${this.renderInputField('Caption', attrs('caption'), data.caption || '', 'Optional image caption')}
                            ${this.renderSelectField('Image Size', attrs('size', 'select'), normalizeImageSize(data.size, data.stretched), IMAGE_SIZES)}
                        </div>
                        <div class="layout-inline-actions layout-inline-actions--left">
                            <button type="button" class="layout-action" data-action="upload-image" data-section="${sectionIndex}" data-column="${columnIndex}" data-block="${blockIndex}">Upload Image</button>
                            <button type="button" class="layout-action" data-action="clear-image" data-section="${sectionIndex}" data-column="${columnIndex}" data-block="${blockIndex}">Clear Image</button>
                        </div>
                        <div class="layout-toggle-row">
                            ${this.renderToggle('Add border', attrs('withBorder', 'checkbox'), !!data.withBorder)}
                            ${this.renderToggle('Tint background', attrs('withBackground', 'checkbox'), !!data.withBackground)}
                        </div>
                        ${this.renderImagePreview(data)}
                    `;

                case 'list':
                    return `
                        <div class="layout-grid layout-grid--two">
                            ${this.renderSelectField('List Style', attrs('style', 'select'), data.style === 'ordered' ? 'ordered' : 'unordered', { unordered: 'Bulleted', ordered: 'Numbered' })}
                            <div class="layout-field layout-field--hinted">
                                <span class="layout-field__label">Tip</span>
                                <p class="layout-field__hint">Use one line per item. Empty lines are ignored when saving.</p>
                            </div>
                            <div class="layout-grid__span-2">
                                ${this.renderTextareaField('List Items', attrs('items', 'list-items'), (Array.isArray(data.items) ? data.items : []).join('\n'), 'Write one item per line')}
                            </div>
                        </div>
                    `;

                case 'quote':
                    return `
                        ${this.renderRichField('Quote Text', attrs('text', 'rich'), data.text || '', 'Add the quote copy here...')}
                        ${this.renderInputField('Source / Caption', attrs('caption'), data.caption || '', 'Optional author or attribution')}
                    `;

                case 'callout':
                    return `
                        <div class="layout-grid layout-grid--two">
                            ${this.renderInputField('Callout Title', attrs('title'), data.title || '', 'Key takeaway')}
                            ${this.renderSelectField('Tone', attrs('tone', 'select'), data.tone || 'accent', CALLOUT_TONES)}
                            <div class="layout-grid__span-2">
                                ${this.renderRichField('Callout Copy', attrs('text', 'rich'), data.text || '', 'Summarize the important point or instruction...')}
                            </div>
                        </div>
                    `;

                case 'button':
                    return `
                        <div class="layout-grid layout-grid--two">
                            ${this.renderInputField('Button Label', attrs('text'), data.text || '', 'Learn More')}
                            ${this.renderInputField('Button URL', attrs('url', 'url'), data.url || '', 'https://example.com')}
                            ${this.renderSelectField('Button Style', attrs('style', 'select'), data.style || 'solid', BUTTON_STYLES)}
                            ${this.renderSelectField('Alignment', attrs('align', 'select'), data.align || 'left', BUTTON_ALIGNMENTS)}
                        </div>
                        ${this.renderButtonPreview(data)}
                    `;

                case 'embed':
                    return `
                        <div class="layout-grid layout-grid--two">
                            <div class="layout-grid__span-2">
                                ${this.renderInputField('Video or Embed URL', attrs('url', 'url'), data.url || '', 'Paste a YouTube or Vimeo link')}
                            </div>
                            <div class="layout-grid__span-2">
                                ${this.renderInputField('Caption', attrs('caption'), data.caption || '', 'Optional embed caption')}
                            </div>
                        </div>
                        ${this.renderEmbedPreview(data)}
                    `;

                case 'code':
                    return this.renderTextareaField('Code Block', attrs('code', 'code'), data.code || '', 'Paste code, JSON, or preformatted text here', true);

                case 'delimiter':
                    return `
                        <div class="layout-preview layout-preview--divider">
                            <span>Section divider</span>
                            <strong>***</strong>
                        </div>
                    `;

                default:
                    return this.renderRichField('Paragraph Copy', attrs('text', 'rich'), data.text || '', 'Write your paragraph here.');
            }
        }

        renderInputField(label, attrs, value, placeholder) {
            return `
                <label class="layout-field">
                    <span class="layout-field__label">${esc(label)}</span>
                    <input type="text" class="form-control" ${attrs} value="${esc(value || '')}" placeholder="${esc(placeholder || '')}">
                </label>
            `;
        }

        renderTextareaField(label, attrs, value, placeholder, isCode = false) {
            return `
                <label class="layout-field">
                    <span class="layout-field__label">${esc(label)}</span>
                    <textarea class="form-control layout-textarea${isCode ? ' is-code' : ''}" ${attrs} placeholder="${esc(placeholder || '')}">${esc(value || '')}</textarea>
                </label>
            `;
        }

        renderSelectField(label, attrs, value, options) {
            return `
                <label class="layout-field">
                    <span class="layout-field__label">${esc(label)}</span>
                    <select class="form-control" ${attrs}>${optionMarkup(options, String(value ?? ''))}</select>
                </label>
            `;
        }

        renderToggle(label, attrs, checked) {
            return `
                <label class="layout-toggle">
                    <input type="checkbox" ${attrs}${checked ? ' checked' : ''}>
                    <span>${esc(label)}</span>
                </label>
            `;
        }

        renderRichField(label, attrs, value, placeholder, compact = false) {
            return `
                <div class="layout-field layout-rich-field">
                    <span class="layout-field__label">${esc(label)}</span>
                    <div class="layout-rich-toolbar">${richToolbarMarkup()}</div>
                    <div class="layout-rich-editor${compact ? ' is-compact' : ''}" contenteditable="true" spellcheck="true" ${attrs} data-placeholder="${esc(placeholder || '')}">${value || ''}</div>
                </div>
            `;
        }

        renderImagePreview(data) {
            const url = String(data.url || '').trim();
            if (!url) {
                return `
                    <div class="layout-preview layout-preview--empty">
                        <strong>No image selected yet</strong>
                        <p>Upload an image or paste a direct image URL to preview it here.</p>
                    </div>
                `;
            }

            const size = normalizeImageSize(data.size, data.stretched);
            const classes = [
                'layout-preview',
                'layout-preview--image',
                `layout-preview--image-${size}`,
                data.withBorder ? 'has-border' : '',
                data.withBackground ? 'has-background' : ''
            ].filter(Boolean).join(' ');

            return `
                <div class="${classes}">
                    <img src="${esc(url)}" alt="${esc(data.caption || 'Image preview')}">
                    ${data.caption ? `<p>${esc(data.caption)}</p>` : ''}
                </div>
            `;
        }

        renderButtonPreview(data) {
            const text = plainText(data.text || '') || 'Learn More';
            const style = Object.prototype.hasOwnProperty.call(BUTTON_STYLES, data.style) ? data.style : 'solid';
            const align = Object.prototype.hasOwnProperty.call(BUTTON_ALIGNMENTS, data.align) ? data.align : 'left';
            return `
                <div class="layout-preview layout-preview--button layout-preview--button-${align}">
                    <span class="layout-button-preview layout-button-preview--${style}">${esc(text)}</span>
                </div>
            `;
        }

        renderEmbedPreview(data) {
            const src = normalizeEmbedUrl(data.url || '');
            if (!src) {
                return `
                    <div class="layout-preview layout-preview--empty">
                        <strong>Paste a video link</strong>
                        <p>YouTube and Vimeo links will automatically convert into responsive embeds.</p>
                    </div>
                `;
            }

            return `
                <div class="layout-preview layout-preview--embed">
                    <iframe src="${esc(src)}" loading="lazy" allowfullscreen allow="autoplay; encrypted-media"></iframe>
                    ${data.caption ? `<p>${esc(data.caption)}</p>` : ''}
                </div>
            `;
        }

        handleMouseDown(event) {
            if (event.target.closest('[data-rich-command]')) {
                event.preventDefault();
            }
        }

        handleClick(event) {
            const richButton = event.target.closest('[data-rich-command]');
            if (richButton) {
                event.preventDefault();
                this.applyRichCommand(richButton);
                return;
            }

            const actionButton = event.target.closest('[data-action]');
            if (!actionButton) return;
            event.preventDefault();
            this.handleAction(actionButton);
        }

        handleInput(event) {
            const field = event.target.closest('[data-target]');
            if (!field) return;
            this.updateFromElement(field, false);
        }

        handleChange(event) {
            if (event.target.matches('[data-role="image-picker"]')) {
                const file = event.target.files?.[0];
                if (file) this.handleImageSelection(file, event.target);
                return;
            }

            const field = event.target.closest('[data-target]');
            if (!field) return;
            this.updateFromElement(field, true);
        }

        handleBlur(event) {
            const field = event.target.closest('[data-target]');
            if (!field) return;
            this.updateFromElement(field, true);
        }

        applyRichCommand(button) {
            const richField = button.closest('.layout-rich-field');
            const editor = richField?.querySelector('.layout-rich-editor');
            if (!editor) return;

            editor.focus();
            const command = button.dataset.richCommand;

            if (command === 'createLink') {
                const current = window.getSelection()?.toString()?.trim() || '';
                const url = normalizeExternalUrl(window.prompt(`Paste the link URL${current ? ` for “${current}”` : ''}`) || '');
                if (!url) return;
                document.execCommand('createLink', false, url);
            } else if (command === 'removeFormat') {
                document.execCommand('removeFormat', false, null);
                document.execCommand('unlink', false, null);
            } else {
                document.execCommand(command, false, null);
            }

            this.updateFromElement(editor, true);
        }
        readElementValue(element) {
            const kind = element.dataset.kind || 'text';
            if (kind === 'checkbox') return !!element.checked;
            if (kind === 'rich') return cleanRichTextHtml(element.innerHTML || '');
            if (kind === 'list-items') return String(element.value || '')
                .split(/\r?\n/)
                .map(item => plainText(item))
                .filter(Boolean);
            return element.value ?? '';
        }

        updateFromElement(element, commit) {
            const sectionIndex = Number(element.dataset.section);
            const field = element.dataset.field;
            if (!field || Number.isNaN(sectionIndex)) return;

            if (element.dataset.target === 'section') {
                const section = this.getSection(sectionIndex);
                if (!section) return;
                const value = this.readElementValue(element);
                this.updateSectionField(section, field, value);
                this.render();
                return;
            }

            const columnIndex = Number(element.dataset.column);
            const blockIndex = Number(element.dataset.block);
            const block = this.getBlock(sectionIndex, columnIndex, blockIndex);
            if (!block) return;

            const value = this.readElementValue(element);
            this.updateBlockField(block, field, value, commit);

            if ((element.dataset.kind || '') === 'rich') {
                const cleaned = cleanRichTextHtml(element.innerHTML || '');
                if (!hasRichContent(cleaned)) element.innerHTML = '';
                else if (cleaned !== element.innerHTML) element.innerHTML = cleaned;
            }

            if (this.shouldRenderAfterUpdate(block.type, field, element, commit)) {
                this.render();
            }
        }

        updateSectionField(section, field, value) {
            const data = section.data || (section.data = {});
            if (field === 'layout') {
                const layout = Object.prototype.hasOwnProperty.call(SECTION_LAYOUTS, value) ? value : 'single';
                data.layout = layout;
                data.columns = reflowColumns(data.columns, getLayoutColumnCount(layout));
                return;
            }
            if (field === 'width') {
                data.width = Object.prototype.hasOwnProperty.call(SECTION_WIDTHS, value) ? value : 'wide';
                return;
            }
            if (field === 'surface') {
                data.surface = Object.prototype.hasOwnProperty.call(SECTION_SURFACES, value) ? value : 'default';
                return;
            }
            if (field === 'gap') {
                data.gap = Object.prototype.hasOwnProperty.call(SECTION_GAPS, value) ? value : 'normal';
            }
        }

        updateBlockField(block, field, value, commit) {
            const data = block.data || (block.data = {});
            switch (block.type) {
                case 'header':
                    if (field === 'text') data.text = cleanRichTextHtml(value);
                    if (field === 'level') data.level = clampHeadingLevel(value);
                    break;

                case 'paragraph':
                    if (field === 'text') data.text = cleanRichTextHtml(value);
                    break;

                case 'image':
                    if (field === 'url') data.url = String(value || '').trim();
                    if (field === 'caption') data.caption = plainText(value);
                    if (field === 'size') data.size = normalizeImageSize(value, false);
                    if (field === 'withBorder') data.withBorder = !!value;
                    if (field === 'withBackground') data.withBackground = !!value;
                    break;

                case 'list':
                    if (field === 'style') data.style = value === 'ordered' ? 'ordered' : 'unordered';
                    if (field === 'items') data.items = Array.isArray(value) ? value : normalizeListItems(value);
                    break;

                case 'quote':
                    if (field === 'text') data.text = cleanRichTextHtml(value);
                    if (field === 'caption') data.caption = plainText(value);
                    break;

                case 'callout':
                    if (field === 'title') data.title = plainText(value);
                    if (field === 'text') data.text = cleanRichTextHtml(value);
                    if (field === 'tone') data.tone = Object.prototype.hasOwnProperty.call(CALLOUT_TONES, value) ? value : 'accent';
                    break;

                case 'button':
                    if (field === 'text') data.text = plainText(value);
                    if (field === 'url') data.url = commit ? normalizeExternalUrl(value) : String(value || '').trim();
                    if (field === 'style') data.style = Object.prototype.hasOwnProperty.call(BUTTON_STYLES, value) ? value : 'solid';
                    if (field === 'align') data.align = Object.prototype.hasOwnProperty.call(BUTTON_ALIGNMENTS, value) ? value : 'left';
                    break;

                case 'embed':
                    if (field === 'url') data.url = commit ? normalizeEmbedUrl(value) : String(value || '').trim();
                    if (field === 'caption') data.caption = plainText(value);
                    break;

                case 'code':
                    if (field === 'code') data.code = String(value || '');
                    break;

                default:
                    if (field === 'text') data.text = cleanRichTextHtml(value);
                    break;
            }
        }

        shouldRenderAfterUpdate(blockType, field, element, commit) {
            if (!commit) return false;
            if ((element.dataset.target || '') === 'section') return true;
            if (element.dataset.kind === 'checkbox' || element.tagName === 'SELECT') return true;
            return [
                'url',
                'caption',
                'style',
                'align',
                'tone'
            ].includes(field) && ['image', 'button', 'embed', 'callout'].includes(blockType);
        }

        handleAction(button) {
            const action = button.dataset.action;
            const sectionIndex = Number(button.dataset.section);
            const columnIndex = Number(button.dataset.column);
            const blockIndex = Number(button.dataset.block);
            const layout = button.dataset.layout || 'single';
            const blockType = button.dataset.blockType || 'paragraph';

            switch (action) {
                case 'append-section':
                    this.sections.push(createDefaultSection(layout));
                    this.render();
                    return;

                case 'insert-section-after':
                    this.sections.splice(Number.isNaN(sectionIndex) ? this.sections.length : sectionIndex + 1, 0, createDefaultSection(layout));
                    this.render();
                    return;

                case 'duplicate-section': {
                    const section = this.getSection(sectionIndex);
                    if (!section) return;
                    this.sections.splice(sectionIndex + 1, 0, normalizeSection(clone(section)));
                    this.render();
                    return;
                }

                case 'move-section-up':
                    this.moveSection(sectionIndex, -1);
                    return;

                case 'move-section-down':
                    this.moveSection(sectionIndex, 1);
                    return;

                case 'delete-section':
                    this.deleteSection(sectionIndex);
                    return;

                case 'add-block': {
                    const column = this.getColumn(sectionIndex, columnIndex);
                    if (!column) return;
                    column.blocks.push(createDefaultBlock(blockType));
                    this.render();
                    return;
                }

                case 'duplicate-block': {
                    const column = this.getColumn(sectionIndex, columnIndex);
                    const block = this.getBlock(sectionIndex, columnIndex, blockIndex);
                    if (!column || !block) return;
                    column.blocks.splice(blockIndex + 1, 0, normalizeBlock(clone(block)) || createDefaultBlock('paragraph'));
                    this.render();
                    return;
                }

                case 'move-block-up':
                    this.moveBlock(sectionIndex, columnIndex, blockIndex, -1);
                    return;

                case 'move-block-down':
                    this.moveBlock(sectionIndex, columnIndex, blockIndex, 1);
                    return;

                case 'move-block-left':
                    this.moveBlockAcrossColumns(sectionIndex, columnIndex, blockIndex, -1);
                    return;

                case 'move-block-right':
                    this.moveBlockAcrossColumns(sectionIndex, columnIndex, blockIndex, 1);
                    return;

                case 'delete-block':
                    this.deleteBlock(sectionIndex, columnIndex, blockIndex);
                    return;

                case 'upload-image':
                    this.pendingImageTarget = { sectionIndex, columnIndex, blockIndex };
                    this.holder.querySelector('[data-role="image-picker"]')?.click();
                    return;

                case 'clear-image': {
                    const block = this.getBlock(sectionIndex, columnIndex, blockIndex);
                    if (!block || block.type !== 'image') return;
                    block.data.url = '';
                    block.data.caption = '';
                    this.render();
                    return;
                }

                default:
                    return;
            }
        }

        moveSection(sectionIndex, direction) {
            if (Number.isNaN(sectionIndex)) return;
            const targetIndex = sectionIndex + direction;
            if (targetIndex < 0 || targetIndex >= this.sections.length) return;
            [this.sections[sectionIndex], this.sections[targetIndex]] = [this.sections[targetIndex], this.sections[sectionIndex]];
            this.render();
        }

        deleteSection(sectionIndex) {
            if (Number.isNaN(sectionIndex)) return;
            if (this.sections.length === 1) {
                this.sections = [createDefaultSection('single')];
            } else {
                this.sections.splice(sectionIndex, 1);
            }
            this.render();
        }

        moveBlock(sectionIndex, columnIndex, blockIndex, direction) {
            const column = this.getColumn(sectionIndex, columnIndex);
            if (!column) return;
            const targetIndex = blockIndex + direction;
            if (targetIndex < 0 || targetIndex >= column.blocks.length) return;
            [column.blocks[blockIndex], column.blocks[targetIndex]] = [column.blocks[targetIndex], column.blocks[blockIndex]];
            this.render();
        }

        moveBlockAcrossColumns(sectionIndex, columnIndex, blockIndex, direction) {
            const section = this.getSection(sectionIndex);
            if (!section) return;
            const sourceColumn = this.getColumn(sectionIndex, columnIndex);
            const targetColumn = this.getColumn(sectionIndex, columnIndex + direction);
            if (!sourceColumn || !targetColumn) return;
            const [block] = sourceColumn.blocks.splice(blockIndex, 1);
            if (!block) return;
            targetColumn.blocks.splice(Math.min(blockIndex, targetColumn.blocks.length), 0, block);
            this.render();
        }

        deleteBlock(sectionIndex, columnIndex, blockIndex) {
            const column = this.getColumn(sectionIndex, columnIndex);
            if (!column) return;
            column.blocks.splice(blockIndex, 1);
            this.render();
        }

        async handleImageSelection(file, input) {
            const target = this.pendingImageTarget;
            this.pendingImageTarget = null;
            if (input) input.value = '';
            if (!target) return;
            const block = this.getBlock(target.sectionIndex, target.columnIndex, target.blockIndex);
            if (!block || block.type !== 'image') return;
            if (!this.uploadImage) {
                this.showToast('Image upload is unavailable in this editor.', 'error');
                return;
            }

            try {
                this.showToast('Uploading image...', 'success');
                const url = await this.uploadImage(file);
                block.data.url = url;
                this.render();
                this.showToast('Image uploaded successfully.', 'success');
            } catch (error) {
                console.error('Image upload failed:', error);
                this.showToast(`Image upload failed: ${error.message || 'Unknown error'}`, 'error');
            }
        }

        buildOutput() {
            const sections = this.sections
                .map(section => normalizeSection(section))
                .map(section => ({
                    type: 'section',
                    data: {
                        ...section.data,
                        columns: section.data.columns.map(column => ({
                            blocks: column.blocks
                                .map(normalizeBlock)
                                .filter(block => block && isBlockMeaningful(block))
                        }))
                    }
                }))
                .filter(section => section.data.columns.some(column => column.blocks.length));

            return sections.length ? sections : [createDefaultSection('single')];
        }

        async save() {
            return {
                time: Date.now(),
                version: 'kaizen-layout-editor-v2',
                blocks: this.buildOutput()
            };
        }
    }

    window.KaizenBlogEditor = KaizenBlogEditor;
})();

