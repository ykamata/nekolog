<script setup lang="ts">
// TypeScript interfaces for Contact page
interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ContactInfo {
  title: string;
  description: string;
  methods: ContactMethod[];
}

interface ContactMethod {
  type: 'email' | 'github' | 'website';
  label: string;
  value: string;
  icon: string;
}

interface FormValidation {
  isValid: boolean;
  errors: Record<keyof ContactForm, string>;
}

// Page meta configuration
useSeoMeta({
  title: 'Contact - Nuxt 3 TypeScript Project',
  description: 'Get in touch with the Nuxt 3 TypeScript project team',
});

// Reactive form data
const form = reactive<ContactForm>({
  name: '',
  email: '',
  subject: '',
  message: '',
});

// Contact information
const contactInfo = reactive<ContactInfo>({
  title: 'Get in Touch',
  description:
    'Have questions about this Nuxt 3 TypeScript project? Feel free to reach out!',
  methods: [
    {
      type: 'email',
      label: 'Email',
      value: 'contact@example.com',
      icon: '📧',
    },
    {
      type: 'github',
      label: 'GitHub',
      value: 'https://github.com/example/nuxt3-typescript',
      icon: '🐙',
    },
    {
      type: 'website',
      label: 'Website',
      value: 'https://example.com',
      icon: '🌐',
    },
  ],
});

// Form state
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const submitMessage = ref('');

// Form validation
const validation = computed<FormValidation>(() => {
  const errors: Record<keyof ContactForm, string> = {
    name: '',
    email: '',
    subject: '',
    message: '',
  };

  let isValid = true;

  // Name validation
  if (!form.name.trim()) {
    errors.name = 'Name is required';
    isValid = false;
  }
  else if (form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
    isValid = false;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) {
    errors.email = 'Email is required';
    isValid = false;
  }
  else if (!emailRegex.test(form.email)) {
    errors.email = 'Please enter a valid email address';
    isValid = false;
  }

  // Subject validation
  if (!form.subject.trim()) {
    errors.subject = 'Subject is required';
    isValid = false;
  }
  else if (form.subject.trim().length < 5) {
    errors.subject = 'Subject must be at least 5 characters';
    isValid = false;
  }

  // Message validation
  if (!form.message.trim()) {
    errors.message = 'Message is required';
    isValid = false;
  }
  else if (form.message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters';
    isValid = false;
  }

  return { isValid, errors };
});

// Methods
const submitForm = async (): Promise<void> => {
  if (!validation.value.isValid) {
    return;
  }

  isSubmitting.value = true;

  try {
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Reset form
    Object.assign(form, {
      name: '',
      email: '',
      subject: '',
      message: '',
    });

    isSubmitted.value = true;
    submitMessage.value
      = 'Thank you for your message! We\'ll get back to you soon.';

    // Hide success message after 5 seconds
    setTimeout(() => {
      isSubmitted.value = false;
      submitMessage.value = '';
    }, 5000);
  }
  catch {
    submitMessage.value
      = 'Sorry, there was an error sending your message. Please try again.';
  }
  finally {
    isSubmitting.value = false;
  }
};

const resetForm = (): void => {
  Object.assign(form, {
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  isSubmitted.value = false;
  submitMessage.value = '';
};

const getContactLink = (method: ContactMethod): string => {
  switch (method.type) {
    case 'email':
      return `mailto:${method.value}`;
    case 'github':
    case 'website':
      return method.value;
    default:
      return '#';
  }
};

onMounted(() => {
  console.log('Contact page mounted');
});
</script>

<template>
  <div class="contact-page">
    <!-- Page Header -->
    <section class="page-header">
      <h1 class="page-title">
        {{ contactInfo.title }}
      </h1>
      <p class="page-description">
        {{ contactInfo.description }}
      </p>
    </section>

    <div class="contact-content">
      <!-- Contact Form -->
      <section class="contact-form-section">
        <h2 class="section-title">
          Send a Message
        </h2>

        <!-- Success Message -->
        <div
          v-if="isSubmitted"
          class="success-message"
        >
          {{ submitMessage }}
        </div>

        <form
          class="contact-form"
          @submit.prevent="submitForm"
        >
          <!-- Name Field -->
          <div class="form-group">
            <label
              for="name"
              class="form-label"
            >Name *</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              class="form-input"
              :class="{ error: validation.errors.name }"
              placeholder="Your full name"
            >
            <span
              v-if="validation.errors.name"
              class="error-message"
            >
              {{ validation.errors.name }}
            </span>
          </div>

          <!-- Email Field -->
          <div class="form-group">
            <label
              for="email"
              class="form-label"
            >Email *</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              class="form-input"
              :class="{ error: validation.errors.email }"
              placeholder="your.email@example.com"
            >
            <span
              v-if="validation.errors.email"
              class="error-message"
            >
              {{ validation.errors.email }}
            </span>
          </div>

          <!-- Subject Field -->
          <div class="form-group">
            <label
              for="subject"
              class="form-label"
            >Subject *</label>
            <input
              id="subject"
              v-model="form.subject"
              type="text"
              class="form-input"
              :class="{ error: validation.errors.subject }"
              placeholder="What is this about?"
            >
            <span
              v-if="validation.errors.subject"
              class="error-message"
            >
              {{ validation.errors.subject }}
            </span>
          </div>

          <!-- Message Field -->
          <div class="form-group">
            <label
              for="message"
              class="form-label"
            >Message *</label>
            <textarea
              id="message"
              v-model="form.message"
              class="form-textarea"
              :class="{ error: validation.errors.message }"
              placeholder="Your message here..."
              rows="6"
            />
            <span
              v-if="validation.errors.message"
              class="error-message"
            >
              {{ validation.errors.message }}
            </span>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button
              type="submit"
              :disabled="!validation.isValid || isSubmitting"
              class="submit-btn"
            >
              {{ isSubmitting ? "Sending..." : "Send Message" }}
            </button>
            <button
              type="button"
              class="reset-btn"
              @click="resetForm"
            >
              Reset Form
            </button>
          </div>
        </form>
      </section>

      <!-- Contact Information -->
      <section class="contact-info-section">
        <h2 class="section-title">
          Contact Information
        </h2>

        <div class="contact-methods">
          <div
            v-for="method in contactInfo.methods"
            :key="method.type"
            class="contact-method"
          >
            <div class="method-icon">
              {{ method.icon }}
            </div>
            <div class="method-details">
              <h3 class="method-label">
                {{ method.label }}
              </h3>
              <a
                :href="getContactLink(method)"
                class="method-value"
                :target="method.type !== 'email' ? '_blank' : ''"
                :rel="method.type !== 'email' ? 'noopener noreferrer' : ''"
              >
                {{ method.value }}
              </a>
            </div>
          </div>
        </div>

        <!-- Additional Info -->
        <div class="additional-info">
          <h3 class="info-title">
            Response Time
          </h3>
          <p class="info-text">
            We typically respond to messages within 24-48 hours during business
            days.
          </p>

          <h3 class="info-title">
            Project Status
          </h3>
          <p class="info-text">
            This is a demonstration project showcasing Nuxt 3 with TypeScript.
            Feel free to explore the code and ask questions!
          </p>
        </div>
      </section>
    </div>

    <!-- Navigation -->
    <section class="navigation">
      <div class="nav-links">
        <NuxtLink
          to="/"
          class="nav-link"
        >
          ← Home
        </NuxtLink>
        <NuxtLink
          to="/about"
          class="nav-link"
        >
          ← About
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contact-page {
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
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.contact-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
}

.section-title {
  font-size: 1.8rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.contact-form-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  border: 1px solid #c3e6cb;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 2px solid #dee2e6;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #007bff;
}

.form-input.error,
.form-textarea.error {
  border-color: #dc3545;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.error-message {
  color: #dc3545;
  font-size: 0.85rem;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.submit-btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #0056b3;
}

.submit-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.reset-btn {
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: #6c757d;
  border: 2px solid #6c757d;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  background: #6c757d;
  color: white;
}

.contact-info-section {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
  height: fit-content;
}

.contact-methods {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.contact-method {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.method-icon {
  font-size: 1.5rem;
  width: 40px;
  text-align: center;
}

.method-details {
  flex: 1;
}

.method-label {
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.25rem;
}

.method-value {
  color: #007bff;
  text-decoration: none;
  font-size: 0.9rem;
}

.method-value:hover {
  text-decoration: underline;
}

.additional-info {
  border-top: 1px solid #dee2e6;
  padding-top: 1.5rem;
}

.info-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
}

.info-title:first-child {
  margin-top: 0;
}

.info-text {
  color: #6c757d;
  line-height: 1.5;
  font-size: 0.9rem;
}

.navigation {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid #dee2e6;
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
  .contact-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .contact-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .contact-form-section,
  .contact-info-section {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .nav-links {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
