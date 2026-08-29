import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EventSectionComponent } from './components/event-section/event-section.component';
import { FooterSectionComponent } from './components/footer-section/footer-section.component';
import { GiftSectionComponent } from './components/gift-section/gift-section.component';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { IntroSectionComponent } from './components/intro-section/intro-section.component';
import { RsvpSectionComponent } from './components/rsvp-section/rsvp-section.component';
import { SaveTheDateSectionComponent } from './components/save-the-date-section/save-the-date-section.component';
import { StorySectionComponent } from './components/story-section/story-section.component';
import { TimelineSectionComponent } from './components/timeline-section/timeline-section.component';

@Component({
  selector: 'app-wedding-home',
  standalone: true,
  host: {
    '(contextmenu)': 'preventContentMenu($event)',
    '(copy)': 'preventContentCopy($event)',
    '(dragstart)': 'preventImageDrag($event)',
  },
  imports: [
    HeroSectionComponent,
    IntroSectionComponent,
    SaveTheDateSectionComponent,
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
  private refreshFrame?: number;
  private layoutObserver?: ResizeObserver;
  private refreshTimer?: number;

  protected preventContentMenu(event: MouseEvent): void {
    if (!this.isEditableTarget(event.target)) {
      event.preventDefault();
    }
  }

  protected preventContentCopy(event: ClipboardEvent): void {
    if (!this.isEditableTarget(event.target)) {
      event.preventDefault();
    }
  }

  protected preventImageDrag(event: DragEvent): void {
    if (event.target instanceof Element && event.target.closest('img')) {
      event.preventDefault();
    }
  }

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
          enterStart?: string;
          enterEnd?: string;
          exitStart?: string;
          exitEnd?: string;
          skipLateSections?: boolean;
          skipEventSection?: boolean;
        } = {},
      ): void => {
        const enterStart = options.enterStart ?? 'top 96%';
        const enterEnd = options.enterEnd ?? 'top 72%';
        const exitStart = options.exitStart ?? 'bottom 15%';
        const exitEnd = options.exitEnd ?? 'bottom -8%';

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

          gsap.fromTo(
            element,
            { y: enterOffset, autoAlpha: 0, filter: 'blur(8px)' },
            {
              y: 0,
              autoAlpha: 1,
              filter: 'blur(0px)',
              ease: 'none',
              scrollTrigger: {
                trigger: element,
                start: enterStart,
                end: enterEnd,
                scrub: true,
              },
            },
          );

          gsap.fromTo(
            element,
            { y: 0, autoAlpha: 1, filter: 'blur(0px)' },
            {
              y: exitOffset,
              autoAlpha: 0,
              filter: 'blur(8px)',
              immediateRender: false,
              ease: 'none',
              scrollTrigger: {
                trigger: element,
                start: exitStart,
                end: exitEnd,
                scrub: true,
              },
            },
          );
        });
      };

      const animateScrollEnterOnly = (
        selector: string,
        options: { start?: string; end?: string } = {},
      ): void => {
        const start = options.start ?? 'top 96%';
        const end = options.end ?? 'top 72%';

        gsap.utils.toArray<HTMLElement>(selector).forEach((element) => {
          gsap.fromTo(
            element,
            { y: enterOffset, autoAlpha: 0, filter: 'blur(8px)' },
            {
              y: 0,
              autoAlpha: 1,
              filter: 'blur(0px)',
              ease: 'none',
              scrollTrigger: {
                trigger: element,
                start,
                end,
                scrub: true,
              },
            },
          );
        });
      };

      const animateSectionExit = (trigger: string, selector: string): void => {
        gsap.to(selector, {
          y: exitOffset,
          autoAlpha: 0,
          filter: 'blur(8px)',
          stagger: 0.05,
          ease: 'none',
          scrollTrigger: {
            trigger,
            start: 'bottom 15%',
            end: 'bottom -8%',
            scrub: true,
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
          '.save-the-date-date',
          '.timeline-item',
          '.event-card dl > div',
          '.venue-photo img',
          '.event-card .btn-row',
          '.countdown-part',
          '.countdown-finished',
          '.rsvp-panel',
          '.save-the-date-video',
        ].join(', '),
        { skipLateSections: true, skipEventSection: true },
      );

      animateScrollLifecycle('.photo-reveal');

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
        ['.faq-section .section-kicker', '.faq-section [data-animate="title"]'].join(', '),
      );

      animateScrollLifecycle('.faq-item');

      animateScrollEnterOnly(
        [
          '.gift-card .section-kicker',
          '.gift-card [data-animate="title"]',
          '.gift-card .section-copy',
          '.gift-card .whatsapp-confirmation',
        ].join(', '),
        { start: 'top 100%', end: 'top 55%' },
      );

      animateScrollEnterOnly('.guest-message-disclosure', {
        start: 'top 96%',
        end: 'top 72%',
      });

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
    this.mediaContext.add('(max-width: 859px)', () => {
      gsap.utils.toArray<HTMLElement>('.photo-reveal').forEach((figure, index) => {
        const frame = figure.querySelector<HTMLElement>('.photo-frame');

        if (!frame) {
          return;
        }

        const image = frame.querySelector<HTMLImageElement>('img');
        const captionTargets = Array.from(
          figure.querySelectorAll<HTMLElement>('figcaption, .proposal-video-link'),
        );

        gsap.fromTo(
          frame,
          {
            clipPath: 'inset(100% 0% 0% 0% round 0.75rem)',
            rotate: index % 2 === 0 ? -0.65 : 0.65,
            scale: 0.965,
          },
          {
            clipPath: 'inset(0% 0% 0% 0% round 0.75rem)',
            rotate: 0,
            scale: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: frame,
              start: 'top 96%',
              end: 'top 54%',
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          },
        );

        if (image) {
          gsap.fromTo(
            image,
            { scale: 1.1, yPercent: 2.5 },
            {
              scale: 1.055,
              yPercent: -2.5,
              ease: 'none',
              scrollTrigger: {
                trigger: frame,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.65,
                invalidateOnRefresh: true,
              },
            },
          );
        }

        if (captionTargets.length) {
          gsap.fromTo(
            captionTargets,
            { autoAlpha: 0, y: 18 },
            {
              autoAlpha: 1,
              y: 0,
              stagger: 0.08,
              ease: 'none',
              scrollTrigger: {
                trigger: frame,
                start: 'top 64%',
                end: 'top 43%',
                scrub: 0.45,
                invalidateOnRefresh: true,
              },
            },
          );
        }
      });
    });

    this.mediaContext.add('(min-width: 900px)', () => {
      ScrollTrigger.create({
        trigger: '.event-section',
        start: 'top top',
        end: '+=420',
        pin: '.event-card',
        pinSpacing: true,
      });
    });

    this.refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

    this.layoutObserver = new ResizeObserver(() => {
      if (this.refreshTimer !== undefined) {
        window.clearTimeout(this.refreshTimer);
      }

      this.refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    });

    const layoutTargets = window.matchMedia('(max-width: 899px)').matches
      ? document.querySelectorAll<HTMLElement>('main')
      : document.querySelectorAll<HTMLElement>('.guest-message-panel, app-faq-accordion');

    layoutTargets.forEach((element) => this.layoutObserver?.observe(element));
  }

  ngOnDestroy(): void {
    if (this.refreshFrame !== undefined) {
      window.cancelAnimationFrame(this.refreshFrame);
    }
    if (this.refreshTimer !== undefined) {
      window.clearTimeout(this.refreshTimer);
    }
    this.layoutObserver?.disconnect();
    this.mediaContext?.revert();
    this.gsapContext?.revert();
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
    );
  }
}
