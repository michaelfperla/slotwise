# SlotWise Frontend Foundation

## 🎯 Overview

This document outlines the comprehensive frontend foundation that has been implemented for SlotWise, providing a solid base for all future development work.

## 🎨 Design System

### Color Palette
- **Primary**: Teal/Aquamarine (`#00A99D`) - Main brand color for CTAs and key elements
- **Secondary**: Slate Gray (`#64748b`) - Text and secondary elements
- **Accent**: Coral (`#FF7F50`) - Highlights and secondary CTAs
- **Success**: Green (`#22c55e`) - Success states and confirmations
- **Warning**: Amber (`#f59e0b`) - Warnings and important notices
- **Error**: Red (`#ef4444`) - Error states and validation failures
- **Neutral**: Gray scale for backgrounds and borders

### Typography
- **Primary Font**: Lato - Clean, readable sans-serif for body text
- **Heading Font**: Montserrat - Modern, bold font for headings and UI elements
- **Mono Font**: Geist Mono - For code and technical content

### Spacing & Layout
- Consistent spacing scale using Tailwind's spacing system
- Custom spacing values: 18 (4.5rem), 88 (22rem), 128 (32rem)
- Responsive breakpoints following Tailwind defaults

## 🧩 Core Components

### UI Components (`/src/components/ui/`)

#### Button
- Multiple variants: primary, secondary, accent, outline, ghost, link, destructive, success, warning
- Size options: sm, default, lg, xl, icon
- Loading states with spinner
- Left/right icon support
- `asChild` prop for composition

#### Card
- Variants: default, elevated, outlined, ghost
- Padding options: none, sm, default, lg
- Hover effects: none, lift, glow
- Composed with CardHeader, CardTitle, CardDescription, CardContent, CardFooter

#### Input
- Variants: default, error, success
- Size options: sm, default, lg
- Built-in password visibility toggle
- Left/right icon support
- Integrated label, error, and success message display

#### Modal
- Built on Radix UI Dialog primitive
- Accessible by default
- Smooth animations
- Overlay and content components
- Header, footer, title, and description components

#### Badge
- Multiple variants for different states
- Size options
- Icon support
- Perfect for status indicators

### Layout Components (`/src/components/layout/`)

#### Navbar
- Responsive design with mobile menu
- Role-based navigation (business owner vs client)
- User profile integration
- Consistent branding

#### Sidebar
- Collapsible design
- Role-based navigation items
- Active state indicators
- Badge support for notifications

#### DashboardLayout
- Combines sidebar with main content area
- Responsive layout
- Proper spacing and overflow handling

#### PageLayout Components
- PageLayout: Main container with consistent spacing
- PageHeader: Standardized page headers with actions
- PageContent: Content wrapper with proper spacing
- PageSection: Reusable section component

## 🛠 Utilities

### Class Name Utility (`/src/utils/cn.ts`)
- Combines `clsx` and `tailwind-merge`
- Handles conditional classes and proper Tailwind class merging
- Used throughout all components for consistent styling

## 📱 Responsive Design

- Mobile-first approach
- Consistent breakpoints
- Touch-friendly interactions
- Collapsible navigation for mobile

## ♿ Accessibility

- WCAG AA compliant color contrast
- Keyboard navigation support
- Screen reader friendly
- Focus indicators
- Semantic HTML structure

## 🎭 Animations

- Smooth transitions for state changes
- Loading states and spinners
- Hover effects
- Modal and dropdown animations
- Custom keyframes: fadeIn, slideUp, slideDown

## 📦 Dependencies Added

- `class-variance-authority`: For component variant management
- Existing dependencies leveraged:
  - `@radix-ui/*`: Accessible UI primitives
  - `lucide-react`: Icon library
  - `tailwind-merge`: Tailwind class merging
  - `clsx`: Conditional class names

## 🚀 Usage Examples

### Basic Button Usage
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="lg" leftIcon={<Plus />}>
  Create New
</Button>
```

### Card with Content
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

<Card hover="lift">
  <CardHeader>
    <CardTitle>Dashboard Stats</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your content here</p>
  </CardContent>
</Card>
```

### Page Layout
```tsx
import { PageLayout, PageHeader, PageContent } from '@/components/layout';

<PageLayout>
  <PageHeader title="Dashboard" description="Welcome back!">
    <Button>Action</Button>
  </PageHeader>
  <PageContent>
    {/* Your page content */}
  </PageContent>
</PageLayout>
```

## 🎯 Next Steps

This foundation provides:

1. **Consistent Design Language**: All components follow the same design principles
2. **Reusable Components**: Modular components that can be composed together
3. **Type Safety**: Full TypeScript support with proper prop types
4. **Accessibility**: Built-in accessibility features
5. **Responsive Design**: Mobile-first responsive components
6. **Developer Experience**: Easy to use and extend

The foundation is now ready for the team to build upon with the 5 parallel sprint tasks covering:
- Business Dashboard Core
- Calendar & Scheduling
- Service Management
- Client Booking Flow
- Analytics & Reporting

## 🔧 Development Notes

- All components use the `cn()` utility for class merging
- Consistent prop patterns across all components
- Forward refs for proper component composition
- Variants managed with `class-variance-authority`
- Icons from `lucide-react` for consistency
- Built on Radix UI primitives for accessibility
