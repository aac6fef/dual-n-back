#!/bin/bash

# --- 配置 ---
# 设置你的源图标文件
SOURCE_ICON="Icon-macOS-Default-1024x1024@1x.png"
# 设置用于 .icns 的临时文件夹名称
ICONSET_NAME="AppIcon.iconset"

# --- 检查依赖 ---
# 检查 ImageMagick v7 (magick 命令) 是否安装
if ! command -v magick &>/dev/null; then
	echo "错误: ImageMagick (magick 命令) 未安装。"
	echo "你的系统可能安装了旧版，或未安装。请安装最新版 (例如: brew install imagemagick)"
	exit 1
fi

# 检查 iconutil 是否可用 (macOS)
if ! command -v iconutil &>/dev/null; then
	echo "警告: 'iconutil' 命令未找到。无法创建 .icns 文件。"
fi

# 检查源文件是否存在
if [ ! -f "$SOURCE_ICON" ]; then
	echo "错误: 源图标文件 '$SOURCE_ICON' 未找到！"
	exit 1
fi

echo "源图标: $SOURCE_ICON"
echo "检测到 ImageMagick v7+，使用 'magick' 命令生成图标..."

# --- 1. 生成 Tauri 需要的 PNG 图标 ---
echo "正在生成 PNG 文件..."
magick "$SOURCE_ICON" -resize 32x32 -strip -density 72 -units PixelsPerInch 32x32.png
magick "$SOURCE_ICON" -resize 128x128 -strip -density 72 -units PixelsPerInch 128x128.png
magick "$SOURCE_ICON" -resize 256x256 -strip -density 72 -units PixelsPerInch 128x128@2x.png
magick "$SOURCE_ICON" -resize 1024x1024 -strip -density 72 -units PixelsPerInch icon.png

# --- 2. 生成 Windows AppX 清单图标 ---
echo "正在生成 Windows AppX 图标..."
magick "$SOURCE_ICON" -resize 50x50 -strip -density 72 -units PixelsPerInch StoreLogo.png
magick "$SOURCE_ICON" -resize 30x30 -strip -density 72 -units PixelsPerInch Square30x30Logo.png
magick "$SOURCE_ICON" -resize 44x44 -strip -density 72 -units PixelsPerInch Square44x44Logo.png
magick "$SOURCE_ICON" -resize 71x71 -strip -density 72 -units PixelsPerInch Square71x71Logo.png
magick "$SOURCE_ICON" -resize 89x89 -strip -density 72 -units PixelsPerInch Square89x89Logo.png
magick "$SOURCE_ICON" -resize 107x107 -strip -density 72 -units PixelsPerInch Square107x107Logo.png
magick "$SOURCE_ICON" -resize 142x142 -strip -density 72 -units PixelsPerInch Square142x142Logo.png
magick "$SOURCE_ICON" -resize 150x150 -strip -density 72 -units PixelsPerInch Square150x150Logo.png
magick "$SOURCE_ICON" -resize 284x284 -strip -density 72 -units PixelsPerInch Square284x284Logo.png
magick "$SOURCE_ICON" -resize 310x310 -strip -density 72 -units PixelsPerInch Square310x310Logo.png

# --- 3. 生成 .ico 文件 (适用于 Windows) ---
echo "正在创建 icon.ico..."
# 对于ICO，我们同样清理元数据
magick "$SOURCE_ICON" -strip -density 72 -units PixelsPerInch -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# --- 4. 生成 .icns 文件 (适用于 macOS) ---
if command -v iconutil &>/dev/null; then
	echo "正在创建 icon.icns..."
	mkdir -p "$ICONSET_NAME"

	# 定义一个函数来减少重复代码
	generate_icns_png() {
		magick "$SOURCE_ICON" -resize $1 -strip -density 72 -units PixelsPerInch "$ICONSET_NAME/$2.png"
	}

	generate_icns_png 16x16 "icon_16x16"
	generate_icns_png 32x32 "icon_16x16@2x"
	generate_icns_png 32x32 "icon_32x32"
	generate_icns_png 64x64 "icon_32x32@2x"
	generate_icns_png 128x128 "icon_128x128"
	generate_icns_png 256x256 "icon_128x128@2x"
	generate_icns_png 256x256 "icon_256x256"
	generate_icns_png 512x512 "icon_256x256@2x"
	generate_icns_png 512x512 "icon_512x512"
	generate_icns_png 1024x1024 "icon_512x512@2x"

	iconutil -c icns "$ICONSET_NAME" -o icon.icns
	rm -rf "$ICONSET_NAME"
fi

echo "✅ 所有图标已成功生成！"
