<div align="center">
  <h1> <strong> YMovies - A Movie Recommendation Platform </strong></h1>
</div>
<div align="center">
  
  [![Live Demo](https://img.shields.io/badge/Live%20Demo-success?style=for-the-badge)](https://ymovies.yerradouani.me)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
  [![TMDB](https://img.shields.io/badge/TMDB-01D277?style=for-the-badge&logo=themoviedb&logoColor=white)](https://www.themoviedb.org/)
  
  **A Netflix-style movie recommendation platform with intelligent AI-powered movie recommendations and modern web technologies.**
  
  [Live Demo](https://ymovies.yerradouani.me) • [Documentation](./docs) • [Issues](../../issues) • [Discussions](../../discussions)
  
</div>

<img width="2880" height="1695" alt="ymovies yerradouani me_" src="https://github.com/user-attachments/assets/2ef63bc8-0bc8-441e-9662-a66806a1e100" />

## What Makes YMovies Special

- **Smart AI Recommendations** - 13+ personalized categories powered by content analysis.
- **Rich Movie Database** - 800,000+ movies from TMDB with detailed information, trailers, and reviews. 
- **Secure Authentication** - Firebase-powered user accounts with personalized watchlists and preferences. 
- **Modern Interface** - Netflix-style responsive design with smooth animations and accessibility support. 

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS (deployed on Vercel)
- **Backend**: Node.js + Express + PostgreSQL (deployed on Heroku)
- **AI Engine**: Python + Flask for machine learning recommendations
- **External APIs**: TMDB for movie data, Firebase for authentication

## Quick Start

### **One-Command Setup (Recommended)**

**New to the project? Start here:**

```bash
# Linux/Mac users
git clone https://github.com/yassnemo/ymovies-v3.git
cd ymovies-v3
chmod +x setup.sh && ./setup.sh

# Windows users
git clone https://github.com/yassnemo/ymovies-v3.git
cd ymovies-v3
setup.bat
```

This automated setup will:
- ✅ Install all dependencies
- ✅ Create your environment file
- ✅ Guide you through API key setup
- ✅ Check your system requirements

### **Start Development**

After setup, you have options:

```bash
# Option 1: Full development (needs database setup)
npm run dev

# Option 2: Simple mode (works without database)
npm run dev:simple

# Option 3: Frontend only (for UI development)
npm run dev:client
```

**For the quickest start**: Use `npm run dev:simple` - it works immediately with just TMDB API key!

### **Required API Keys**

You'll need these to get started:

1. **TMDB API Key** (required) - [Get it free here](https://www.themoviedb.org/settings/api)
2. **Firebase Project** (for authentication) - [Setup guide](https://firebase.google.com/)
3. **Database URL** (optional) - Use `npm run dev:simple` to skip this initially

### **Troubleshooting**

Having issues? We've got you covered:

- **Setup problems**: Check `docs/TROUBLESHOOTING.md`
- **Environment issues**: Run `node scripts/development/check-env-simple.js`
- **Still stuck**: [Create an issue](../../issues) or check the FAQ

---
## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS  
- **Backend**: Node.js + Express + Python ML Service  
- **Database**: PostgreSQL + Drizzle ORM  
- **Auth**: Firebase Authentication + JWT  
- **Deployment**: Heroku (Backend) + Vercel (Frontend)

## Deployment

**Quick Deploy**:
- **Frontend**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyassnemo%2Fymovies-v3)
- **Backend**: Deploy to [Heroku](https://heroku.com) using `npm run build:heroku`

**Detailed guides**: Check [`docs/deployment/`](./docs/deployment) for step-by-step instructions

## Contributing

1. Fork the repo and create a branch: `git checkout -b feature/amazing-feature`
2. Make changes and test: `npm test`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push and open a Pull Request

**Full guidelines**: [Contributing Guide](./docs/CONTRIBUTING.md)


## Credits

- [TMDB](https://www.themoviedb.org/) for movie data
- Open-source libraries that made this possible

## Support

- **Documentation**: [`docs/`](./docs)
- **Issues**: [GitHub Issues](../../issues)
- **Contact**: [mailbot@yerradouani.me](mailto:mailbot@yerradouani.me)

##  License

MIT License - see the [LICENSE](LICENSE) file for details.


---

<div align="center">

**Built With Love By This Guy [Yassine Erradouani](https://yerradouani.me)**

⭐ **And of course, star this project if you found it helpful!**

</div>





