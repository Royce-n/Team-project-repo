# Makefile for General Petition PDF Generation
# University of Houston - Approval System

# Directories
TEMPLATE_DIR = templates
OUTPUT_DIR = output
SIGNATURE_DIR = signatures

# LaTeX compiler
LATEX = pdflatex
LATEX_FLAGS = -interaction=nonstopmode -output-directory=$(OUTPUT_DIR)

# Default target
.PHONY: all
all: help

# Help message
.PHONY: help
help:
	@echo "General Petition PDF Generation Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make compile PETITION_ID=<id>     - Compile a specific petition"
	@echo "  make clean                         - Remove auxiliary files"
	@echo "  make clean-all                     - Remove all generated files"
	@echo "  make test                          - Test LaTeX installation"
	@echo ""
	@echo "Example:"
	@echo "  make compile PETITION_ID=123"

# Test LaTeX installation
.PHONY: test
test:
	@echo "Testing LaTeX installation..."
	@which pdflatex > /dev/null || (echo "ERROR: pdflatex not found. Please install TeX Live or MiKTeX." && exit 1)
	@pdflatex --version | head -n 1
	@echo "LaTeX is properly installed."

# Create directories if they don't exist
.PHONY: dirs
dirs:
	@mkdir -p $(OUTPUT_DIR)
	@mkdir -p $(SIGNATURE_DIR)
	@mkdir -p $(TEMPLATE_DIR)

# Compile a specific petition (called from Node.js service)
.PHONY: compile
compile: dirs
ifndef PETITION_ID
	$(error PETITION_ID is not set. Usage: make compile PETITION_ID=<id>)
endif
	@echo "Compiling petition $(PETITION_ID)..."
	@$(LATEX) $(LATEX_FLAGS) $(OUTPUT_DIR)/petition_$(PETITION_ID).tex
	@$(LATEX) $(LATEX_FLAGS) $(OUTPUT_DIR)/petition_$(PETITION_ID).tex
	@echo "PDF generated: $(OUTPUT_DIR)/petition_$(PETITION_ID).pdf"

# Clean auxiliary files
.PHONY: clean
clean:
	@echo "Cleaning auxiliary files..."
	@rm -f $(OUTPUT_DIR)/*.aux
	@rm -f $(OUTPUT_DIR)/*.log
	@rm -f $(OUTPUT_DIR)/*.out
	@rm -f $(OUTPUT_DIR)/*.toc
	@rm -f $(OUTPUT_DIR)/*.lof
	@rm -f $(OUTPUT_DIR)/*.lot
	@echo "Auxiliary files removed."

# Clean all generated files (PDFs and signatures)
.PHONY: clean-all
clean-all: clean
	@echo "Removing all generated files..."
	@rm -f $(OUTPUT_DIR)/*.pdf
	@rm -f $(OUTPUT_DIR)/*.tex
	@rm -f $(SIGNATURE_DIR)/*
	@echo "All generated files removed."

# View a PDF (opens in default PDF viewer)
.PHONY: view
view:
ifndef PETITION_ID
	$(error PETITION_ID is not set. Usage: make view PETITION_ID=<id>)
endif
	@if [ -f "$(OUTPUT_DIR)/petition_$(PETITION_ID).pdf" ]; then \
		xdg-open $(OUTPUT_DIR)/petition_$(PETITION_ID).pdf 2>/dev/null || \
		open $(OUTPUT_DIR)/petition_$(PETITION_ID).pdf 2>/dev/null || \
		start $(OUTPUT_DIR)/petition_$(PETITION_ID).pdf 2>/dev/null || \
		echo "Could not open PDF. Please open manually: $(OUTPUT_DIR)/petition_$(PETITION_ID).pdf"; \
	else \
		echo "Error: PDF file not found: $(OUTPUT_DIR)/petition_$(PETITION_ID).pdf"; \
	fi

# List all generated PDFs
.PHONY: list
list:
	@echo "Generated PDFs:"
	@ls -lh $(OUTPUT_DIR)/*.pdf 2>/dev/null || echo "No PDFs found."

# Install LaTeX dependencies (Ubuntu/Debian)
.PHONY: install-deps-ubuntu
install-deps-ubuntu:
	@echo "Installing LaTeX dependencies for Ubuntu/Debian..."
	@sudo apt-get update
	@sudo apt-get install -y texlive-latex-base texlive-latex-extra texlive-fonts-recommended

# Install LaTeX dependencies (macOS with Homebrew)
.PHONY: install-deps-mac
install-deps-mac:
	@echo "Installing LaTeX dependencies for macOS..."
	@brew install --cask mactex-no-gui

# Check if all required LaTeX packages are installed
.PHONY: check-packages
check-packages:
	@echo "Checking LaTeX packages..."
	@kpsewhich geometry.sty > /dev/null || echo "WARNING: geometry package not found"
	@kpsewhich graphicx.sty > /dev/null || echo "WARNING: graphicx package not found"
	@kpsewhich array.sty > /dev/null || echo "WARNING: array package not found"
	@kpsewhich fancyhdr.sty > /dev/null || echo "WARNING: fancyhdr package not found"
	@kpsewhich tabularx.sty > /dev/null || echo "WARNING: tabularx package not found"
	@kpsewhich hyperref.sty > /dev/null || echo "WARNING: hyperref package not found"
	@kpsewhich xcolor.sty > /dev/null || echo "WARNING: xcolor package not found"
	@kpsewhich ifthen.sty > /dev/null || echo "WARNING: ifthen package not found"
	@echo "Package check complete."

.DEFAULT_GOAL := help
