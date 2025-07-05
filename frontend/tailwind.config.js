/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Palette "Rouge Moderne Élégant" - Harmonieuse et sophistiquée
        primary: "#DC143C",      // Rouge carmin principal
        secondary: "#F472B6",    // Rose moderne élégant  
        accent: "#B91C1C",       // Rouge foncé pour emphasis
        
        // Couleurs neutres modernes
        slate: {
          50: "#F8FAFC",         // Blanc très doux
          100: "#F1F5F9",        // Gris très clair
          200: "#E2E8F0",        // Gris clair pour bordures
          300: "#CBD5E1",        // Gris moyen clair
          400: "#94A3B8",        // Gris moyen
          500: "#64748B",        // Gris foncé pour textes secondaires
          600: "#475569",        // Gris foncé
          700: "#334155",        // Gris très foncé
          800: "#1E293B",        // Quasi noir
          900: "#0F172A",        // Noir élégant
        },
        
        // Couleurs blanc cassé avec nuance rouge/rosé
        rose: {
          25: "#FFFBFC",         // Blanc cassé très léger rosé
          50: "#FDF2F8",         // Blanc cassé rosé
          75: "#FCE7F3",         // Blanc cassé plus rosé
          100: "#F9E8EA",        // Blanc cassé rouge très léger
        },
        
        // Couleurs système élégantes
        background: "#FFFBFC",   // Blanc cassé rosé très léger
        surface: "#FDF2F8",      // Surface blanc cassé rosé
        muted: "#F9E8EA",        // Arrière-plans atténués rosés
        border: "#F0D4D7",       // Bordures rosées subtiles
        text: "#0F172A",         // Texte principal
        textLight: "#64748B",    // Texte secondaire
        textMuted: "#94A3B8",    // Texte atténué
        
        // Couleurs de status modernes
        success: "#10B981",      // Vert moderne
        warning: "#F59E0B",      // Orange moderne
        error: "#EF4444",        // Rouge d'erreur
        info: "#3B82F6",         // Bleu informatif
        
        // Aliases pour compatibilité (couleurs manquantes dans les composants)
        coral: "#DC143C",        // Alias pour primary
        sunset: "#F472B6",       // Alias pour secondary
        twilight: "#0F172A",     // Alias pour text
        peach: "#FDF2F8",        // Rose très pâle
        golden: "#F59E0B",       // Orange doré moderne
        charcoal: "#1E293B",     // Charbon moderne
        
        // Couleurs neutres supplémentaires - épurées
        steel: "#94A3B8",        // Acier pour contraste
        
        // Variants pour les composants ShadCN
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#DC143C",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#FDF2F8",
          foreground: "#0F172A",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F9E8EA",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#F472B6",
          foreground: "#0F172A",
        },
        popover: {
          DEFAULT: "#FFFBFC",
          foreground: "#0F172A",
        },
        card: {
          DEFAULT: "#FFFBFC",
          foreground: "#0F172A",
        },
      },
      fontFamily: {
        'display': ['Poppins', 'system-ui', 'sans-serif'],
        'script': ['Dancing Script', 'cursive'],
        'sans': ['Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-soft": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-primary": "glow-primary 3s ease-in-out infinite alternate",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "glow-primary": {
          "0%": { boxShadow: "0 0 20px rgba(220, 20, 60, 0.15)" },
          "100%": { boxShadow: "0 0 30px rgba(220, 20, 60, 0.25)" },
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #DC143C 0%, #F472B6 100%)',
        'gradient-soft': 'linear-gradient(135deg, #FFFBFC 0%, #FDF2F8 100%)',
        'gradient-surface': 'linear-gradient(135deg, #FDF2F8 0%, #F9E8EA 100%)',
        'gradient-elegant': 'linear-gradient(135deg, #FFFBFC 0%, #FDF2F8 50%, #F9E8EA 100%)',
        'gradient-modern': 'linear-gradient(135deg, #FFFBFC 0%, #FDF2F8 50%, #F9E8EA 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 