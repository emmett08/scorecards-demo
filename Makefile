ZIP_NAME := ts-sources.zip

zip-ts:
	@echo "Creating $(ZIP_NAME)..."
	@find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
		! -path "./node_modules/*" \
		! -path "./dist/*" \
		! -path "./.tsup/*" \
		! -path "./dist-types/*" \
	| zip -@ $(ZIP_NAME)
