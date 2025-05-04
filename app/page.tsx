'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { Mic, FileAudio, Brain, CheckCircle, LogOut, ArrowRight, ChevronRight, Sparkles, Clock, LineChart, Search, Users } from 'lucide-react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { GlassCard, AccentBox } from '@/components/ui/design-elements'
import styles from './index.module.css'

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const { user, logout } = useAuth()
  const heroRef = useRef(null)
  const isHeroInView = useInView(heroRef, { once: false })
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { 
        type: "spring",
        damping: 15
      }
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className={`min-h-screen bg-background dark:bg-gradient-black noise-bg ${styles.noiseFilter}`}>
      {/* Floating elements for visual interest */}
      <div className="fixed w-40 h-40 -top-20 -left-20 bg-primary/5 rounded-full blur-3xl z-0"></div>
      <div className="fixed w-60 h-60 top-1/3 -right-32 bg-primary/5 rounded-full blur-3xl z-0"></div>
      <div className="fixed w-40 h-40 bottom-1/4 -left-20 bg-primary/5 rounded-full blur-3xl z-0"></div>
      
      <div className={`absolute inset-0 ${styles.gridPattern} pointer-events-none z-0`}></div>
      
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 text-xl tracking-tight italic">
              Meeting <span className="text-primary">Mind</span>
            </span>
          </div>
          <nav className="flex space-x-4 items-center">
            {user ? (
              <>
                <Link href="/dashboard" className="btn-modern-primary group">
                  Dashboard
                  <ChevronRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-modern-outline"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="animated-underline text-sm font-medium">
                  Sign In
                </Link>
                <Link href="/register" className={`btn-modern-primary group ${styles.shinyButton}`}>
                  Get Started
                  <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section 
          ref={heroRef} 
          className="min-h-[85vh] relative flex flex-col items-center justify-center py-20"
        >
          <motion.div 
            style={{ opacity }}
            className="absolute top-20 right-0 w-full h-full overflow-hidden pointer-events-none z-0"
          >
            <div className="absolute -right-60 top-20 w-[600px] h-[600px] border border-primary/20 rounded-full"></div>
            <div className="absolute -right-40 top-40 w-[400px] h-[400px] border border-primary/20 rounded-full"></div>
            <div className="absolute -right-20 top-60 w-[200px] h-[200px] border border-primary/20 rounded-full"></div>
          </motion.div>
          
          <div className="container mx-auto px-4 z-10">
            <motion.div
              className="max-w-3xl mx-auto text-center"
              initial="hidden"
              animate={isHeroInView ? "visible" : "hidden"}
              variants={containerVariants}
            >
              <motion.h1 
                className={`mb-6 font-extrabold text-foreground ${styles.textOutline}`}
                variants={itemVariants}
              >
                Transform Your <span className={`${styles.gradientText}`}>Meetings</span> with AI
              </motion.h1>
              
              <motion.p
                className="text-lg md:text-xl mb-8 text-muted-foreground"
                variants={itemVariants}
              >
                Capture, analyze, and act on your meeting insights effortlessly
              </motion.p>
              
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register" className={`btn-modern-primary shadow-contrast-dark ${styles.shinyButton}`}>
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
                
                <Link href="#how-it-works" className="btn-modern-ghost">
                  Learn More
                </Link>
              </motion.div>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{delay: 1}}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center">
              <motion.div 
                className="w-1 h-2 bg-primary rounded-full mt-2"
                animate={{
                  y: [0, 15, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "loop"
                }}
              />
            </div>
          </motion.div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 relative">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <div className="inline-block px-12 py-8 rounded-2xl border border-primary/20 bg-black/40 backdrop-blur-sm">
                <h2 className="text-foreground mb-4 font-display font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-blue-500">Experience the Magic</h2>
                <div className="w-20 h-1 bg-gradient-to-r from-primary to-blue-500 mx-auto mb-4 rounded-full"></div>
                <p className="text-muted-foreground max-w-2xl mx-auto">Our cutting-edge AI transforms chaotic meetings into actionable intelligence in seconds.</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="grid md:grid-cols-3 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              {[
                { 
                  icon: FileAudio, 
                  title: "Drop Your Audio", 
                  description: "Simply drag & drop your meeting recordings or connect to your favorite video conferencing platform.",
                  accent: "from-primary to-blue-400"
                },
                { 
                  icon: Brain, 
                  title: "AI Alchemy", 
                  description: "Watch as our advanced AI transforms your audio into structured, categorized information in under 30 seconds.",
                  accent: "from-blue-400 to-violet-500" 
                },
                { 
                  icon: CheckCircle, 
                  title: "Unlock Insights", 
                  description: "Access a beautifully organized dashboard with tasks, decisions, and actionable insights ready to share.",
                  accent: "from-violet-500 to-primary" 
                }
              ].map((step, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="relative group"
                >
                  <GlassCard className={`h-full p-8 ${styles.hoverCard} overflow-hidden relative`}>
                    <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${step.accent} opacity-10 blur-2xl transition-all duration-700 group-hover:opacity-20`}></div>
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-background to-primary/20 flex items-center justify-center mb-6 border border-primary/30 shadow-lg">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                    <motion.div 
                      className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" 
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      transition={{ delay: 0.2 * index, duration: 0.8 }}
                    />
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <div className="inline-block px-12 py-8 rounded-2xl border border-primary/20 bg-black/40 backdrop-blur-sm">
                <h2 className="text-foreground mb-4 font-display font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-blue-500">Supercharged Workflow</h2>
                <div className="w-20 h-1 bg-gradient-to-r from-primary to-blue-500 mx-auto mb-4 rounded-full"></div>
                <p className="text-muted-foreground max-w-2xl mx-auto">Revolutionize how your team captures knowledge and drives decisions forward.</p>
              </div>
            </motion.div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent blur-3xl opacity-30 rounded-3xl"></div>
              
              <motion.div 
                className="grid md:grid-cols-2 gap-10 relative"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={containerVariants}
              >
                {[
                  { 
                    title: "Time Warp", 
                    description: "Reduce 60 minutes of meeting time into 30 seconds of organized, actionable intelligence.", 
                    icon: Clock,
                    gradient: "from-blue-500 to-primary"
                  },
                  { 
                    title: "Productivity Boost", 
                    description: "Focus on deep collaboration, not note-taking. Let AI handle the tedious documentation.", 
                    icon: LineChart,
                    gradient: "from-primary to-violet-500"
                  },
                  { 
                    title: "Photographic Memory", 
                    description: "Never forget a detail again with perfect AI recall of every important discussion point.", 
                    icon: Search,
                    gradient: "from-violet-500 to-blue-500"
                  },
                  { 
                    title: "Team Synergy", 
                    description: "Instant sharing of rich, structured meeting data keeps everyone aligned and moving forward.", 
                    icon: Users,
                    gradient: "from-blue-500 to-primary"
                  }
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="group"
                  >
                    <AccentBox className={`h-full relative overflow-visible group ${styles.hoverCard} border-opacity-30 hover:border-opacity-50 transition-all duration-300`}>
                      <div className={`absolute -z-10 inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-700 rounded-xl`}></div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-black to-primary/20 flex items-center justify-center border border-primary/20 shadow-lg`}>
                          <benefit.icon className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">{benefit.title}</h3>
                      </div>
                      <p className="text-muted-foreground">{benefit.description}</p>
                      <div className="absolute top-3 right-3">
                        <Sparkles className="w-4 h-4 text-primary/30 group-hover:text-primary/70 transition-colors duration-300" />
                      </div>
                    </AccentBox>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Marquee */}
        <div className={`py-12 ${styles.marquee}`}>
          <div className={styles.marqueeContent}>
            <div className="flex space-x-12 opacity-30">
              {["AI-Powered", "Time-Saving", "Insightful", "Collaborative", "Efficient", "Accurate", "Smart", "Revolutionary", "Real-time", "Intelligent"].map((word, i) => (
                <div key={i} className="text-2xl font-bold text-foreground">{word}</div>
              ))}
            </div>
          </div>
        </div>
        
        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div 
              className="max-w-4xl mx-auto text-center bg-card rounded-2xl p-16 border border-border shadow-contrast-dark"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-foreground mb-6">Ready to transform your meetings?</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of teams who are saving time and improving productivity with MeetingMind.
              </p>
              <Link href="/register" className={`btn-modern-primary shadow-contrast-dark group ${styles.shinyButton}`}>
                Get Started Now
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 italic">
                Meeting <span className="text-primary">Mind</span>
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} <span className="font-display italic">Meeting <span className="text-primary">Mind</span></span>. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}