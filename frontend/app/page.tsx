'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  CalendarClock, 
  BarChart3, 
  Shield, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Zap,
  Globe,
  Smartphone
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Comprehensive user profiles, roles, and department management with intuitive interfaces.',
  },
  {
    icon: CalendarClock,
    title: 'Leave Management',
    description: 'Streamlined leave requests, approvals, and balance tracking with calendar integration.',
  },
  {
    icon: Clock,
    title: 'Shift Scheduling',
    description: 'Create shifts, assign employees, and manage shift swaps effortlessly.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Real-time insights into productivity, attendance, and team performance.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Secure multi-role system with Admin, Manager, and Employee permissions.',
  },
  {
    icon: CheckCircle,
    title: 'Project Tracking',
    description: 'Kanban boards, task management, and time logging for complete project visibility.',
  },
];

const stats = [
  { value: '500+', label: 'Companies' },
  { value: '50K+', label: 'Active Users' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

const testimonials = [
  {
    quote: "This platform transformed how we manage our workforce. The leave management alone saved us 20 hours per week.",
    author: "Sarah Johnson",
    role: "HR Director",
    company: "TechCorp Inc."
  },
  {
    quote: "The analytics dashboard gives us real-time insights we never had before. Game changer for decision making.",
    author: "Michael Chen",
    role: "Operations Manager",
    company: "Global Solutions"
  },
  {
    quote: "Intuitive, powerful, and reliable. Our team adoption was seamless and productivity increased immediately.",
    author: "Emily Rodriguez",
    role: "CEO",
    company: "Startup Hub"
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                WorkforceHub
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/signin">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              Trusted by 500+ companies worldwide
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Simplify Your
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Workforce Management
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              All-in-one platform for employee monitoring, leave management, shift scheduling, 
              and project tracking. Streamline your operations with powerful analytics.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-14 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8 h-14 text-lg">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
              <div className="bg-slate-900 p-1">
                <div className="flex items-center gap-2 mb-4 pt-3 px-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="bg-slate-800 rounded-t-lg p-6 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-1/4 h-8 bg-slate-700 rounded" />
                    <div className="flex-1 h-8 bg-slate-700 rounded" />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-24 bg-slate-700 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to Manage Your Team
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Powerful features designed to streamline your workforce operations and boost productivity.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div 
                key={feature.title} 
                className="group p-8 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                  <feature.icon className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Icons */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-12">
            <div className="flex items-center gap-2 text-slate-400">
              <Globe className="w-6 h-6" />
              <span className="font-medium">Web Access</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Smartphone className="w-6 h-6" />
              <span className="font-medium">Mobile Ready</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Zap className="w-6 h-6" />
              <span className="font-medium">Fast Performance</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Loved by Teams Everywhere
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Join thousands of companies that trust our platform to manage their workforce.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div 
                key={testimonial.author} 
                className="p-8 rounded-2xl bg-slate-50 border border-slate-100"
              >
                <p className="text-slate-700 mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.author}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Workforce?
            </h2>
            <p className="text-indigo-100 text-xl mb-8">
              Start your 14-day free trial. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-slate-100 px-8 h-14 text-lg font-semibold">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <span className="text-2xl font-bold text-white">WorkforceHub</span>
              <p className="mt-4 text-slate-400">
                All-in-one workforce management platform for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            &copy; 2024 WorkforceHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}