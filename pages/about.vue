<script setup lang="ts">
// TypeScript interfaces for About page
interface AboutPageData {
  title: string;
  description: string;
  technologies: Technology[];
  projectInfo: ProjectInfo;
}

interface Technology {
  name: string;
  version: string;
  description: string;
  category: 'framework' | 'language' | 'tool';
}

interface ProjectInfo {
  purpose: string;
  features: string[];
  author: string;
  license: string;
}

// Page meta configuration
useSeoMeta({
  title: 'About - Nuxt 3 TypeScript Project',
  description:
    'Learn about this Nuxt 3 project with TypeScript and Composition API',
});

// Reactive data with TypeScript
const aboutData = reactive<AboutPageData>({
  title: 'About This Project',
  description:
    'This is a modern Nuxt 3 project demonstrating TypeScript integration, Vue 3 Composition API, and ESLint configuration.',
  technologies: [
    {
      name: 'Nuxt 3',
      version: '3.11+',
      description: 'The Intuitive Vue Framework',
      category: 'framework',
    },
    {
      name: 'TypeScript',
      version: '5.x',
      description: 'Typed JavaScript at Any Scale',
      category: 'language',
    },
    {
      name: 'Vue 3',
      version: '3.x',
      description: 'The Progressive JavaScript Framework',
      category: 'framework',
    },
    {
      name: 'ESLint',
      version: '9.x',
      description: 'Find and fix problems in JavaScript code',
      category: 'tool',
    },
  ],
  projectInfo: {
    purpose:
      'Demonstrate modern Vue.js development with Nuxt 3, TypeScript, and best practices',
    features: [
      'TypeScript strict mode configuration',
      'Vue 3 Composition API with <script setup>',
      'ESLint integration for linting and formatting',
      'Auto-imports for Vue composables',
      'File-based routing system',
      'SEO meta management',
    ],
    author: 'Development Team',
    license: 'MIT',
  },
});

// Computed properties
const frameworkTechnologies = computed(() =>
  aboutData.technologies.filter(
    (tech: Technology) => tech.category === 'framework',
  ),
);

const toolTechnologies = computed(() =>
  aboutData.technologies.filter((tech: Technology) => tech.category === 'tool'),
);

const languageTechnologies = computed(() =>
  aboutData.technologies.filter(
    (tech: Technology) => tech.category === 'language',
  ),
);

// Methods
const getCategoryColor = (category: Technology['category']): string => {
  const colors = {
    framework: '#28a745',
    language: '#007bff',
    tool: '#ffc107',
  };
  return colors[category];
};

onMounted(() => {
  console.log('About page mounted');
});
</script>

<template>
  <div class="about-page">
    <!-- Page Header -->
    <section class="page-header">
      <h1 class="page-title">
        {{ aboutData.title }}
      </h1>
      <p class="page-description">
        {{ aboutData.description }}
      </p>
    </section>

    <!-- Technologies Section -->
    <section class="technologies">
      <h2 class="section-title">
        Technologies Used
      </h2>

      <div class="tech-categories">
        <div class="tech-category">
          <h3 class="category-title">
            Frameworks
          </h3>
          <div class="tech-grid">
            <div
              v-for="tech in frameworkTechnologies"
              :key="tech.name"
              class="tech-card"
            >
              <div
                class="tech-badge"
                :style="{ backgroundColor: getCategoryColor(tech.category) }"
              >
                {{ tech.category }}
              </div>
              <h4 class="tech-name">
                {{ tech.name }}
              </h4>
              <p class="tech-version">
                v{{ tech.version }}
              </p>
              <p class="tech-description">
                {{ tech.description }}
              </p>
            </div>
          </div>
        </div>

        <div class="tech-category">
          <h3 class="category-title">
            Languages
          </h3>
          <div class="tech-grid">
            <div
              v-for="tech in languageTechnologies"
              :key="tech.name"
              class="tech-card"
            >
              <div
                class="tech-badge"
                :style="{ backgroundColor: getCategoryColor(tech.category) }"
              >
                {{ tech.category }}
              </div>
              <h4 class="tech-name">
                {{ tech.name }}
              </h4>
              <p class="tech-version">
                v{{ tech.version }}
              </p>
              <p class="tech-description">
                {{ tech.description }}
              </p>
            </div>
          </div>
        </div>

        <div class="tech-category">
          <h3 class="category-title">
            Tools
          </h3>
          <div class="tech-grid">
            <div
              v-for="tech in toolTechnologies"
              :key="tech.name"
              class="tech-card"
            >
              <div
                class="tech-badge"
                :style="{ backgroundColor: getCategoryColor(tech.category) }"
              >
                {{ tech.category }}
              </div>
              <h4 class="tech-name">
                {{ tech.name }}
              </h4>
              <p class="tech-version">
                v{{ tech.version }}
              </p>
              <p class="tech-description">
                {{ tech.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Project Info Section -->
    <section class="project-info">
      <h2 class="section-title">
        Project Information
      </h2>

      <div class="info-grid">
        <div class="info-card">
          <h3 class="info-title">
            Purpose
          </h3>
          <p class="info-content">
            {{ aboutData.projectInfo.purpose }}
          </p>
        </div>

        <div class="info-card">
          <h3 class="info-title">
            Key Features
          </h3>
          <ul class="feature-list">
            <li
              v-for="feature in aboutData.projectInfo.features"
              :key="feature"
              class="feature-item"
            >
              {{ feature }}
            </li>
          </ul>
        </div>

        <div class="info-card">
          <h3 class="info-title">
            Project Details
          </h3>
          <div class="detail-item">
            <strong>Author:</strong> {{ aboutData.projectInfo.author }}
          </div>
          <div class="detail-item">
            <strong>License:</strong> {{ aboutData.projectInfo.license }}
          </div>
        </div>
      </div>
    </section>

    <!-- Navigation -->
    <section class="navigation">
      <div class="nav-links">
        <NuxtLink
          to="/"
          class="nav-link"
        >
          ← Back to Home
        </NuxtLink>
        <NuxtLink
          to="/contact"
          class="nav-link"
        >
          Contact →
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.page-description {
  font-size: 1.2rem;
  color: #7f8c8d;
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
}

.section-title {
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 2rem;
  text-align: center;
}

.tech-categories {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 3rem;
}

.tech-category {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
}

.category-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #495057;
  margin-bottom: 1rem;
  text-align: center;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.tech-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
  position: relative;
}

.tech-badge {
  position: absolute;
  top: -8px;
  right: 1rem;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.tech-name {
  font-size: 1.3rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.tech-version {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.tech-description {
  color: #495057;
  line-height: 1.5;
}

.project-info {
  margin-bottom: 3rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.info-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 2rem;
}

.info-title {
  font-size: 1.3rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.info-content {
  color: #495057;
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-item {
  color: #495057;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
  position: relative;
  padding-left: 1.5rem;
}

.feature-item:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #28a745;
  font-weight: bold;
}

.feature-item:last-child {
  border-bottom: none;
}

.detail-item {
  color: #495057;
  margin-bottom: 0.5rem;
}

.navigation {
  text-align: center;
}

.nav-links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.nav-link {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 500;
  transition: background 0.3s ease;
}

.nav-link:hover {
  background: #0056b3;
}

/* Responsive design */
@media (max-width: 768px) {
  .about-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .tech-categories {
    gap: 1.5rem;
  }

  .tech-category {
    padding: 1.5rem;
  }

  .tech-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .nav-links {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
