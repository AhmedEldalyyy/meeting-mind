'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Mic, User, Users } from 'lucide-react';
import axios from 'axios';

export default function RegisterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '', // Default to no role selected
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleSelect = (role: string) => {
    setFormData(prev => ({
      ...prev,
      role
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!formData.role) {
      setError('Please select a role');
      setIsLoading(false);
      return;
    }

    try {
      const registerData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };
      
      const response = await axios.post('/api/auth/register', registerData);
      
      if (response.data) {
        // Auto-login after registration
        try {
          await axios.post('/api/auth/login', {
            email: formData.email,
            password: formData.password
          });
          
          // Use a hard redirect instead of router.push
          // This forces a full page reload and ensures the auth state is fresh
          window.location.href = '/dashboard';
        } catch (loginError) {
          console.error('Auto-login error:', loginError);
          router.push('/login');
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-black noise-bg flex items-center justify-center p-4 relative">
      {/* Floating elements for visual interest */}
      <div className="fixed w-40 h-40 -top-20 -left-20 bg-primary/5 rounded-full blur-3xl z-0"></div>
      <div className="fixed w-60 h-60 top-1/3 -right-32 bg-primary/5 rounded-full blur-3xl z-0"></div>
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
      
      <Card className="w-full max-w-md bg-gradient-to-br from-background to-background/70 backdrop-blur-sm border border-primary/10 shadow-contrast-dark overflow-hidden relative z-10">
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl"></div>
        <CardHeader className="space-y-1 text-center relative">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center border border-primary/20 shadow-lg">
              <Mic className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-blue-500">
            Create an Account
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Sign up to get started with <span className="font-display font-medium italic">Meeting <span className="text-primary">Mind</span></span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 relative">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground/90 font-display text-sm">Full Name</Label>
              <div className="relative">
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  required
                  className="bg-card/50 border-border/50 h-11 pl-3 shadow-inner"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/90 font-display text-sm">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  className="bg-card/50 border-border/50 h-11 pl-3 shadow-inner"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/90 font-display text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="bg-card/50 border-border/50 h-11 pl-3 shadow-inner"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground/90 font-display text-sm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="bg-card/50 border-border/50 h-11 pl-3 shadow-inner"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground/90 font-display text-sm">Select Your Role</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <Button
                  type="button"
                  variant={formData.role === 'TEAM_LEADER' ? 'default' : 'outline'}
                  className={`flex gap-2 h-11 ${
                    formData.role === 'TEAM_LEADER' 
                      ? 'from-indigo-600 to-violet-600' 
                      : 'hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                  onClick={() => handleRoleSelect('TEAM_LEADER')}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    formData.role === 'TEAM_LEADER'
                      ? 'bg-white/20' 
                      : 'bg-indigo-100 dark:bg-indigo-900/30'
                  }`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  Team Leader
                </Button>
                <Button
                  type="button"
                  variant={formData.role === 'TEAM_MEMBER' ? 'default' : 'outline'}
                  className={`flex gap-2 h-11 transition-soft shadow-soft dark:shadow-soft-dark ${
                    formData.role === 'TEAM_MEMBER' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-card/50 hover:bg-primary/10 border-border/50'
                  }`}
                  onClick={() => handleRoleSelect('TEAM_MEMBER')}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    formData.role === 'TEAM_MEMBER'
                      ? 'bg-primary-foreground/20' 
                      : 'bg-primary/10'
                  }`}>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  Team Member
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 relative pb-8">
            <Button 
              type="submit" 
              className="w-full h-11 font-display text-sm font-medium transition-soft shadow-contrast-dark hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 