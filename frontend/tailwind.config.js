/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                screens: {
                        xs: '420px',
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        // FANZINE PT · paleta expandida (single source: index.css :root)
                        pt: {
                                red:        'var(--pt-red)',
                                green:      'var(--pt-green)',
                                gold:       'var(--pt-gold)',
                                azul:       'var(--pt-azul)',
                                ink:        'var(--pt-ink)',
                                cream:      'var(--pt-cream)',
                                bone:       'var(--pt-bone)',
                                telha:      'var(--pt-telha)',
                                'telha-soft':'var(--pt-telha-soft)',
                                brasa:      'var(--pt-brasa)',
                                'brasa-soft':'var(--pt-brasa-soft)',
                                tijolo:     'var(--pt-tijolo)',
                                fado:       'var(--pt-fado)',
                                laranja:    'var(--pt-laranja)',
                                atl:        'var(--pt-atl)',
                                'atl-soft': 'var(--pt-atl-soft)',
                                'azulejo-lite':'var(--pt-azulejo-lite)',
                                peixe:      'var(--pt-peixe)',
                                'peixe-soft':'var(--pt-peixe-soft)',
                                eucalipto:  'var(--pt-eucalipto)',
                                'eucalipto-soft':'var(--pt-eucalipto-soft)',
                                oliveira:   'var(--pt-oliveira)',
                                lima:       'var(--pt-lima)',
                                rosa:       'var(--pt-rosa)',
                                malva:      'var(--pt-malva)',
                                fluo:       'var(--pt-fluo)',
                                branco:     'var(--pt-branco)',
                                cal:        'var(--pt-cal)',
                                areia:      'var(--pt-areia)',
                                pedra:      'var(--pt-pedra)',
                                grafite:    'var(--pt-grafite)',
                        },
                        coral: {
                                DEFAULT: '#e85d4f',
                                50:  '#fdecea',
                                100: '#fbd5d0',
                                200: '#f7aaa1',
                                300: '#f37e72',
                                400: '#ef6f60',
                                500: '#e85d4f',
                                600: '#cf4a3d',
                                700: '#a83b30',
                                deep: '#cf4a3d',
                        },
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        }
                },
                keyframes: {
                        'accordion-down': {
                                from: {
                                        height: '0'
                                },
                                to: {
                                        height: 'var(--radix-accordion-content-height)'
                                }
                        },
                        'accordion-up': {
                                from: {
                                        height: 'var(--radix-accordion-content-height)'
                                },
                                to: {
                                        height: '0'
                                }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};