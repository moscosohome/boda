import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EventSectionComponent } from './components/event-section/event-section.component';
import { FooterSectionComponent } from './components/footer-section/footer-section.component';
import { GiftSectionComponent } from './components/gift-section/gift-section.component';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { IntroSectionComponent } from './components/intro-section/intro-section.component';
import { RsvpSectionComponent } from './components/rsvp-section/rsvp-section.component';
import { StorySectionComponent } from './components/story-section/story-section.component';
import { TimelineSectionComponent } from './components/timeline-section/timeline-section.component';

@Component({
  selector: 'app-wedding-home',
  standalone: true,
  imports: [
    HeroSectionComponent,
    IntroSectionComponent,
    StorySectionComponent,
    TimelineSectionComponent,
    EventSectionComponent,
    RsvpSectionComponent,
    GiftSectionComponent,
    FooterSectionComponent,
  ],
  templateUrl: './wedding-home.component.html',
  styleUrl: './wedding-home.component.scss',
})
export class WeddingHomeComponent implements AfterViewInit, OnDestroy {
  protected readonly showRsvpSection = false;
  private gsapContext?: gsap.Context;
  private mediaContext?: gsap.MatchMedia;

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    this.gsapContext = gsap.context(() => {
      const enterOffset = 48;
      const exitOffset = -48;

      const animateScrollLifecycle = (
        selector: string,
        options: {
          end?: string;
          visibleDuration?: number;
          skipLateSections?: boolean;
          skipEventSection?: boolean;
        } = {},
      ): void => {
        const end = options.end ?? 'top -12%';
        const visibleDuration = options.visibleDuration ?? 0.64;

        gsap.utils.toArray<HTMLElement>(selector).forEach((element) => {
          if (options.skipEventSection && element.closest('.event-section')) {
            return;
          }

          if (
            options.skipLateSections &&
            (element.closest('.faq-section') ||
              element.closest('.gift-section') ||
              element.closest('footer'))
          ) {
            return;
          }

          gsap
            .timeline({
              scrollTrigger: {
                trigger: element,
                start: 'top 88%',
                end,
                scrub: 0.65,
              },
            })
            .fromTo(
              element,
              { y: enterOffset, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, ease: 'none', duration: 0.18 },
            )
            .to(element, { y: 0, autoAlpha: 1, ease: 'none', duration: visibleDuration })
            .to(element, { y: exitOffset, autoAlpha: 0, ease: 'none', duration: 0.18 });
        });
      };

      const animateScrollEnterOnly = (selector: string): void => {
        gsap.utils.toArray<HTMLElement>(selector).forEach((element) => {
          gsap.fromTo(
            element,
            { y: enterOffset, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: element,
                start: 'top 96%',
                end: 'top 72%',
                scrub: 0.65,
              },
            },
          );
        });
      };

      const animateSectionExit = (trigger: string, selector: string): void => {
        gsap.to(selector, {
          y: exitOffset,
          autoAlpha: 0,
          stagger: 0.05,
          ease: 'none',
          scrollTrigger: {
            trigger,
            start: 'bottom 62%',
            end: 'bottom 18%',
            scrub: 0.65,
          },
        });
      };

      gsap
        .timeline({
          scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: '+=430',
            scrub: 0.85,
          },
        })
        .to('.hero-photo-placeholder', { scale: 1.13, yPercent: 3, ease: 'none' }, 0)
        .to(
          '.hero-topline > *, .hero-kicker, #hero-title, .hero-names, .hero-details div, .scroll-cue',
          {
            y: exitOffset,
            autoAlpha: 0,
            stagger: 0.055,
            ease: 'none',
          },
          0,
        );

      animateScrollLifecycle(
        [
          '.intro-line',
          '.section-kicker',
          '[data-animate="title"]',
          '.section-copy',
          '.timeline-item',
          '.event-card dl > div',
          '.venue-photo img',
          '.event-card .btn-row',
          '.countdown-part',
          '.countdown-finished',
          '.rsvp-panel',
        ].join(', '),
        { skipLateSections: true, skipEventSection: true },
      );

      animateScrollLifecycle('.photo-reveal', {
        end: 'bottom 12%',
        visibleDuration: 0.68,
      });

      animateScrollEnterOnly(
        [
          '.event-section .section-kicker',
          '.event-section [data-animate="title"]',
          '.event-section .section-copy',
          '.event-card dl > div',
          '.venue-photo img',
          '.event-card .btn-row',
          '.countdown-part',
          '.countdown-finished',
        ].join(', '),
      );

      animateSectionExit('.event-section', '.event-copy, .event-card');

      animateScrollLifecycle(
        ['.faq-section .section-kicker', '.faq-section [data-animate="title"]', '.faq-item'].join(
          ', ',
        ),
        { end: 'top -12%', visibleDuration: 0.76 },
      );

      animateScrollLifecycle(
        [
          '.gift-card .section-kicker',
          '.gift-card [data-animate="title"]',
          '.gift-card .section-copy',
          '.gift-card .whatsapp-confirmation',
        ].join(', '),
        { end: 'top -12%', visibleDuration: 0.76 },
      );

      animateScrollEnterOnly('footer p, footer span');

      gsap.from('.timeline-line-fill', {
        scaleY: 0,
        transformOrigin: 'top center',
        ease: 'none',
        scrollTrigger: {
          trigger: '.timeline-list',
          start: 'top 72%',
          end: 'bottom 58%',
          scrub: true,
        },
      });
    });

    this.mediaContext = gsap.matchMedia();
    this.mediaContext.add('(min-width: 900px)', () => {
      ScrollTrigger.create({
        trigger: '.event-section',
        start: 'top top',
        end: '+=420',
        pin: '.event-card',
        pinSpacing: true,
      });
    });
  }

  ngOnDestroy(): void {
    this.mediaContext?.revert();
    this.gsapContext?.revert();
  }
}
