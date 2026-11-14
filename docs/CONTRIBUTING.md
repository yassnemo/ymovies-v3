# Contributing to YMovies

## Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm ci`
4. Copy environment template: `cp .env.example .env.local`
5. Set a TMDB credential; configure Supabase and a database only if working on account sync
6. Start development: `npm run dev`

## Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Test changed behavior, especially authentication, persistence and input boundaries
- Update documentation as needed

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Run `npm run check`, `npm test`, `npm run format:check`, and `npm run build`
4. Submit PR with clear description

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run format:check` - Check formatting

Keep changes focused and explain the problem, resulting behavior and validation in the PR. Avoid committing temporary captures, real account data or environment files. Keep author and third-party license notices intact. See [security reporting](../SECURITY.md) for vulnerabilities.

Project by [Yassine Erradouani](https://yerradouani.me).
