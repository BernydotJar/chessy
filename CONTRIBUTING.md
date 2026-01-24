# Contributing to GlassChess

First off, thank you for considering contributing to GlassChess! 🎉

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (screenshots, code snippets)
- **Describe the behavior you observed and what you expected**
- **Include details about your environment** (browser, OS, screen size)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any examples of how this feature could work**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the coding style** used throughout the project
3. **Write clear commit messages**
4. **Test your changes** thoroughly
5. **Update documentation** if needed
6. **Ensure the test suite passes**

## Development Process

### Setting Up Your Development Environment

```bash
# Clone your fork
git clone https://github.com/BernydotJar/chessy.git
cd chessy

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Coding Standards

- **TypeScript**: Use TypeScript for all new files
- **Component Structure**: Follow the existing component patterns
- **Naming**: Use PascalCase for components, camelCase for functions/variables
- **Imports**: Group imports (React, external libs, internal modules)
- **Comments**: Add JSDoc comments for complex functions

### Commit Message Guidelines

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example: `feat: add promotion dialog for pawn moves`

### Testing

Before submitting a PR:

```bash
# Run linter
npm run lint

# Run tests
npm run test

# Build the project
npm run build
```

## Project Structure

```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── store/         # State management (Zustand)
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── styles/        # Global styles
```

## Feature Development Roadmap

### Priority Features (Phase 2)
- AI opponent with difficulty levels
- Promotion dialog UI
- Sound effects for moves
- Move hints and legal move highlighting

### Future Features (Phase 3-5)
- Multiplayer functionality
- User accounts and authentication
- ELO rating system
- Puzzles and tournaments

## Questions?

Feel free to open an issue with the `question` label or reach out to the maintainers.

## Recognition

Contributors will be added to our README and our hearts! ❤️

Thank you for helping make GlassChess better! 🚀
