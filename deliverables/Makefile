all: user-story.pdf contribution.pdf use-case.pdf

user-story.pdf:
	pdflatex -output-directory=deliverables deliverables/user-story.tex

contribution.pdf:
	pdflatex -output-directory=deliverables deliverables/contribution.tex

use-case.pdf:
	# uses plantuml; requires plantuml.jar or plantuml installed
	plantuml -tpdf -o deliverables deliverables/use-case.puml
