class ColorComparisonTool {
    constructor() {
        this.characterImage = null;
        this.merchantAreas = []; // 改为区域数组
        this.refColor = null;
        this.results = [];
        
        // Cropper 实例
        this.characterCropper = null;
        this.merchantCropper = null;
        
        // 当前裁剪的图片信息
        this.currentCropImage = null;
        this.currentCropType = null; // 'character' 或 'merchant'
        this.currentCropAreaId = null; // 当前裁剪的区域ID
        
        this.nextAreaId = 1; // 用于生成唯一区域ID
        
        this.initializeEventListeners();
        this.addMerchantArea(); // 初始添加一个区域
    }

    initializeEventListeners() {
        // 目标图片上传
        const characterUpload = document.getElementById('characterUpload');
        const characterInput = document.getElementById('characterInput');
        
        characterUpload.addEventListener('click', () => characterInput.click());
        characterInput.addEventListener('change', (e) => this.handleCharacterUpload(e));

        // 添加区域按钮
        document.getElementById('addAreaBottomBtn').addEventListener('click', () => this.addMerchantArea());

        // 分析按钮
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeColors());
        
        // 裁剪模态框事件
        this.initializeCropModals();
    }

    initializeCropModals() {
        // 目标图片裁剪模态框
        const characterCropModal = document.getElementById('characterCropModal');
        const characterCloseCrop = document.getElementById('characterCloseCrop');
        const characterCancelCrop = document.getElementById('characterCancelCrop');
        const characterConfirmCrop = document.getElementById('characterConfirmCrop');
        
        characterCloseCrop.addEventListener('click', () => this.closeCropModal());
        characterCancelCrop.addEventListener('click', () => this.closeCropModal());
        characterConfirmCrop.addEventListener('click', () => this.confirmCrop());
        
        // 参考颜色图片裁剪模态框
        const merchantCropModal = document.getElementById('merchantCropModal');
        const merchantCloseCrop = document.getElementById('merchantCloseCrop');
        const merchantCancelCrop = document.getElementById('merchantCancelCrop');
        const merchantConfirmCrop = document.getElementById('merchantConfirmCrop');
        
        merchantCloseCrop.addEventListener('click', () => this.closeCropModal());
        merchantCancelCrop.addEventListener('click', () => this.closeCropModal());
        merchantConfirmCrop.addEventListener('click', () => this.confirmCrop());
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === characterCropModal) {
                this.closeCropModal();
            }
            if (e.target === merchantCropModal) {
                this.closeCropModal();
            }
        });
    }

    addMerchantArea() {
        const areaId = `area_${this.nextAreaId++}`;
        const areaName = `颜色 ${this.nextAreaId - 1}`;
        
        const area = {
            id: areaId,
            name: areaName,
            image: null
        };
        
        this.merchantAreas.push(area);
        this.renderMerchantArea(area);
        this.updateAnalyzeButton();
    }

    removeMerchantArea(areaId) {
        // 如果只剩一个区域，不允许删除
        if (this.merchantAreas.length <= 1) {
            alert('至少需要保留一个参考颜色区域');
            return;
        }
        
        this.merchantAreas = this.merchantAreas.filter(area => area.id !== areaId);
        
        // 从DOM中移除
        const areaElement = document.getElementById(areaId);
        if (areaElement) {
            areaElement.remove();
        }
        
        this.updateAnalyzeButton();
    }

    updateMerchantAreaName(areaId, newName) {
        const area = this.merchantAreas.find(a => a.id === areaId);
        if (area) {
            area.name = newName;
        }
    }

    renderMerchantArea(area) {
        const areasContainer = document.getElementById('merchantAreas');
        
        const areaElement = document.createElement('div');
        areaElement.id = area.id;
        areaElement.className = 'merchant-area';
        
        areaElement.innerHTML = `
            <div class="area-header">
                <input type="text" class="area-name-input" value="${area.name}" 
                       placeholder="输入颜色名称" onchange="colorTool.updateMerchantAreaName('${area.id}', this.value)">
                <button class="remove-area-btn" onclick="colorTool.removeMerchantArea('${area.id}')">删除</button>
            </div>
            <div class="area-upload" onclick="colorTool.openMerchantAreaUpload('${area.id}')">
                <div class="upload-placeholder">
                    <span>点击上传参考颜色图片</span>
                </div>
                <div class="area-preview" id="preview_${area.id}"></div>
            </div>
        `;
        
        areasContainer.appendChild(areaElement);
        
        // 如果区域已有图片，显示预览
        if (area.image) {
            this.renderAreaPreview(area.id, area.image.src);
        }
    }

    renderAreaPreview(areaId, src) {
        const preview = document.getElementById(`preview_${areaId}`);
        preview.innerHTML = `
            <div class="preview-item">
                <img src="${src}" alt="参考颜色图片">
                <button class="remove-btn" onclick="colorTool.removeMerchantAreaImage('${areaId}')">×</button>
                <button class="crop-btn" onclick="colorTool.editMerchantAreaCrop('${areaId}')">✎</button>
            </div>
        `;
    }

    openMerchantAreaUpload(areaId) {
        // 创建隐藏的文件输入
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.showCropModal(file, 'merchant', areaId);
            }
            document.body.removeChild(fileInput);
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
    }

    removeMerchantAreaImage(areaId) {
        const area = this.merchantAreas.find(a => a.id === areaId);
        if (area) {
            area.image = null;
            const preview = document.getElementById(`preview_${areaId}`);
            preview.innerHTML = '';
            this.updateAnalyzeButton();
        }
    }

    handleCharacterUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showCropModal(file, 'character');
    }

    showCropModal(file, type, areaId = null) {
        this.currentCropType = type;
        this.currentCropAreaId = areaId;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const modalId = type === 'character' ? 'characterCropModal' : 'merchantCropModal';
            const imageId = type === 'character' ? 'characterCropImage' : 'merchantCropImage';
            
            const modal = document.getElementById(modalId);
            const image = document.getElementById(imageId);
            
            image.src = e.target.result;
            modal.style.display = 'block';
            
            // 初始化 Cropper
            this.initializeCropper(image, type);
        };
        reader.readAsDataURL(file);
    }

    initializeCropper(imageElement, type) {
        // 销毁现有的 Cropper 实例
        if (type === 'character' && this.characterCropper) {
            this.characterCropper.destroy();
        } else if (type === 'merchant' && this.merchantCropper) {
            this.merchantCropper.destroy();
        }
        
        // 设置自由比例裁剪（不设置aspectRatio）
        const cropper = new Cropper(imageElement, {
            aspectRatio: NaN, // 自由比例
            viewMode: 1,
            autoCropArea: 0.8,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
        
        if (type === 'character') {
            this.characterCropper = cropper;
        } else {
            this.merchantCropper = cropper;
        }
    }

    closeCropModal() {
        document.getElementById('characterCropModal').style.display = 'none';
        document.getElementById('merchantCropModal').style.display = 'none';
        
        // 重置当前裁剪信息
        this.currentCropImage = null;
        this.currentCropType = null;
        this.currentCropAreaId = null;
    }

    confirmCrop() {
        let cropper, type;
        
        if (this.currentCropType === 'character') {
            cropper = this.characterCropper;
            type = 'character';
        } else {
            cropper = this.merchantCropper;
            type = 'merchant';
        }
        
        if (cropper) {
            // 获取裁剪后的 canvas
            const canvas = cropper.getCroppedCanvas();
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                
                if (type === 'character') {
                    this.handleCroppedCharacterImage(url, blob);
                } else {
                    this.handleCroppedMerchantImage(url, blob, this.currentCropAreaId);
                }
                
                this.closeCropModal();
            });
        }
    }

    handleCroppedCharacterImage(url, blob) {
        this.characterImage = new Image();
        this.characterImage.onload = () => {
            this.displayCharacterPreview(url);
            this.calculateReferenceColor();
            this.updateAnalyzeButton();
            URL.revokeObjectURL(url); // 清理内存
        };
        this.characterImage.src = url;
    }

    handleCroppedMerchantImage(url, blob, areaId) {
        const img = new Image();
        img.onload = () => {
            const area = this.merchantAreas.find(a => a.id === areaId);
            if (area) {
                area.image = img;
                this.renderAreaPreview(areaId, url);
                this.updateAnalyzeButton();
            }
            URL.revokeObjectURL(url); // 清理内存
        };
        img.src = url;
    }

    displayCharacterPreview(src) {
        const preview = document.getElementById('characterPreview');
        preview.innerHTML = `
            <div class="preview-item">
                <img src="${src}" alt="目标颜色参考">
                <button class="remove-btn" onclick="colorTool.removeCharacterImage()">×</button>
                <button class="crop-btn" onclick="colorTool.editCharacterCrop()">✎</button>
            </div>
        `;
    }

    editCharacterCrop() {
        if (!this.characterImage) return;
        
        // 将当前图片转换为 Blob 用于重新裁剪
        const canvas = document.createElement('canvas');
        canvas.width = this.characterImage.width;
        canvas.height = this.characterImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.characterImage, 0, 0);
        
        canvas.toBlob((blob) => {
            const file = new File([blob], 'character-crop-edit.png', { type: 'image/png' });
            this.showCropModal(file, 'character');
        });
    }

    editMerchantAreaCrop(areaId) {
        const area = this.merchantAreas.find(a => a.id === areaId);
        if (!area || !area.image) return;
        
        // 将当前图片转换为 Blob 用于重新裁剪
        const canvas = document.createElement('canvas');
        canvas.width = area.image.width;
        canvas.height = area.image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(area.image, 0, 0);
        
        canvas.toBlob((blob) => {
            const file = new File([blob], `merchant-${areaId}-edit.png`, { type: 'image/png' });
            this.showCropModal(file, 'merchant', areaId);
        });
    }

    removeCharacterImage() {
        this.characterImage = null;
        this.refColor = null;
        document.getElementById('characterPreview').innerHTML = '';
        document.getElementById('characterColorDisplay').innerHTML = '';
        document.getElementById('characterInput').value = '';
        this.updateAnalyzeButton();
    }

    updateAnalyzeButton() {
        const btn = document.getElementById('analyzeBtn');
        
        // 检查是否有目标图片和至少一个有图片的参考颜色区域
        const hasCharacterImage = !!this.characterImage;
        const hasMerchantImages = this.merchantAreas.some(area => !!area.image);
        
        btn.disabled = !hasCharacterImage || !hasMerchantImages;
    }

    calculateReferenceColor() {
        if (!this.characterImage) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.characterImage.width;
        canvas.height = this.characterImage.height;
        
        ctx.drawImage(this.characterImage, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const avgColor = this.calculateAverageColor(imageData);
        this.refColor = {
            rgb: avgColor,
            lab: this.rgbToLab(avgColor)
        };

        this.displayReferenceColor();
    }

    calculateAverageColor(imageData) {
        let totalR = 0, totalG = 0, totalB = 0;
        const data = imageData.data;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            totalR += data[i];
            totalG += data[i + 1];
            totalB += data[i + 2];
        }

        return [
            Math.round(totalR / pixelCount),
            Math.round(totalG / pixelCount),
            Math.round(totalB / pixelCount)
        ];
    }

    // RGB 转 Lab 颜色空间
    rgbToLab(rgb) {
        // 先转 XYZ
        let r = rgb[0] / 255;
        let g = rgb[1] / 255;
        let b = rgb[2] / 255;

        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
        let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
        let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

        // 转 Lab
        x /= 95.047;
        y /= 100.000;
        z /= 108.883;

        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

        const L = (116 * y) - 16;
        const a = 500 * (x - y);
        const bVal = 200 * (y - z);

        return [L, a, bVal];
    }

    // ΔE76 颜色差异计算
    deltaE76(lab1, lab2) {
        return Math.sqrt(
            Math.pow(lab1[0] - lab2[0], 2) +
            Math.pow(lab1[1] - lab2[1], 2) +
            Math.pow(lab1[2] - lab2[2], 2)
        );
    }

    rgbToHex(rgb) {
        return '#' + rgb.map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    displayReferenceColor() {
        const display = document.getElementById('characterColorDisplay');
        const hex = this.rgbToHex(this.refColor.rgb);
        const lab = this.refColor.lab;

        display.innerHTML = `
            <div class="color-display-swatch" style="background-color: ${hex};"></div>
            <div class="color-display-details">
                <strong>计算出的平均颜色：</strong>
                <div>RGB: (${this.refColor.rgb.join(', ')})</div>
                <div>HEX: ${hex}</div>
                <div>Lab: (${lab[0].toFixed(2)}, ${lab[1].toFixed(2)}, ${lab[2].toFixed(2)})</div>
            </div>
        `;
    }

    async analyzeColors() {
        if (!this.refColor) return;

        this.results = [];

        // 遍历所有有图片的参考颜色区域
        for (let area of this.merchantAreas) {
            if (area.image) {
                const merchantColor = await this.calculateImageColor(area.image);
                const distance = this.deltaE76(this.refColor.lab, merchantColor.lab);
                
                this.results.push({
                    name: area.name,
                    rgb: merchantColor.rgb,
                    lab: merchantColor.lab,
                    hex: this.rgbToHex(merchantColor.rgb),
                    distance
                });
            }
        }

        this.results.sort((a, b) => a.distance - b.distance);
        this.displayResults();
    }

    calculateImageColor(image) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;
            
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const rgb = this.calculateAverageColor(imageData);
            const lab = this.rgbToLab(rgb);
            
            resolve({ rgb, lab });
        });
    }

    displayResults() {
        this.displayRanking();
        this.displayVisualization();
        document.getElementById('resultsSection').style.display = 'block';
        
        // 显示目标颜色信息
        document.getElementById('refColorSwatch').style.backgroundColor = this.rgbToHex(this.refColor.rgb);
        document.getElementById('refRGB').textContent = this.refColor.rgb.join(', ');
        document.getElementById('refHEX').textContent = this.rgbToHex(this.refColor.rgb);
        document.getElementById('refLab').textContent = 
            `(${this.refColor.lab[0].toFixed(2)}, ${this.refColor.lab[1].toFixed(2)}, ${this.refColor.lab[2].toFixed(2)})`;
    }

    displayRanking() {
        const rankingList = document.getElementById('rankingList');
        rankingList.innerHTML = '';

        const topResults = this.results.slice(0, 5);
        
        topResults.forEach((result, index) => {
            const rankItem = document.createElement('div');
            rankItem.className = `rank-item rank-${index + 1}`;
            
            rankItem.innerHTML = `
                <div class="rank-badge">${index + 1}</div>
                <div class="rank-color" style="background-color: ${result.hex};"></div>
                <div class="rank-details">
                    <div><strong>${result.name}</strong></div>
                    <div>RGB: (${result.rgb.join(', ')})</div>
                    <div>HEX: ${result.hex}</div>
                    <div>ΔE: ${result.distance.toFixed(2)}</div>
                </div>
            `;
            
            rankingList.appendChild(rankItem);
        });
    }

    displayVisualization() {
        const canvas = document.getElementById('colorCanvas');
        const ctx = canvas.getContext('2d');
        
        const squareSize = 200;
        const topResults = this.results.slice(0, 5);
        
        // 清空画布
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制前5个颜色方块
        topResults.forEach((result, index) => {
            const x = index * squareSize;
            const y = 0;
            
            // 绘制颜色方块
            ctx.fillStyle = result.hex;
            ctx.fillRect(x, y, squareSize, squareSize);
            
            // 绘制文字（根据亮度选择文字颜色）
            const brightness = (result.rgb[0] * 299 + result.rgb[1] * 587 + result.rgb[2] * 114) / 1000;
            ctx.fillStyle = brightness > 128 ? 'black' : 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            
            // 排名
            ctx.fillText(`第${index + 1}名`, x + squareSize/2, y + 40);
            
            // ΔE值
            ctx.font = '16px Arial';
            ctx.fillText(`ΔE: ${result.distance.toFixed(2)}`, x + squareSize/2, y + 70);
            
            // 颜色名称
            const name = result.name || '未命名颜色';
            ctx.fillText(name.length > 8 ? name.substring(0, 8) + '...' : name, 
                        x + squareSize/2, y + squareSize - 40);
            
            // HEX值
            ctx.fillText(result.hex, x + squareSize/2, y + squareSize - 15);
        });
        
        // 绘制目标颜色条
        const targetY = squareSize;
        ctx.fillStyle = this.rgbToHex(this.refColor.rgb);
        ctx.fillRect(0, targetY, canvas.width, squareSize);
        
        // 目标颜色文字
        const targetBrightness = (this.refColor.rgb[0] * 299 + this.refColor.rgb[1] * 587 + this.refColor.rgb[2] * 114) / 1000;
        ctx.fillStyle = targetBrightness > 128 ? 'black' : 'white';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('目标颜色', canvas.width/2, targetY + squareSize/2 - 20);
        ctx.font = '18px Arial';
        ctx.fillText(this.rgbToHex(this.refColor.rgb), canvas.width/2, targetY + squareSize/2 + 20);
    }
}

// 初始化工具
const colorTool = new ColorComparisonTool();