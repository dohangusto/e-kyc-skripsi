import 'package:flutter/material.dart';

import '../core/constants/routes.dart';
import '../features/auth/presentation/pages/splash_page.dart';
import '../features/auth/presentation/pages/app_intro_page.dart';
import '../features/auth/presentation/pages/eligibility_page.dart';
import '../features/dashboard/presentation/pages/dashboard_page.dart';
import '../features/chat/presentation/pages/chat_page.dart';
import '../features/ekyc/presentation/pages/ktp_capture_page.dart';
import '../features/ekyc/presentation/pages/ktp_intro_page.dart';
import '../features/ekyc/presentation/pages/selfie_intro_page.dart';
import '../features/ekyc/presentation/pages/liveness_gesture_page.dart';
import '../features/ekyc/presentation/pages/liveness_intro_page.dart';
import '../features/ekyc/presentation/pages/selfie_with_ktp_page.dart';
import '../features/ekyc/presentation/pages/ekyc_complete_page.dart';

class AppRouter {
  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case AppRoutes.splash:
        return MaterialPageRoute(
          builder: (_) => const SplashPage(),
          settings: settings,
        );

      case AppRoutes.intro:
        return MaterialPageRoute(
          builder: (_) => const AppIntroPage(),
          settings: settings,
        );

      case AppRoutes.eligibility:
        return MaterialPageRoute(
          builder: (_) => const EligibilityPage(),
          settings: settings,
        );

      case AppRoutes.dashboard:
        return MaterialPageRoute(
          builder: (_) => const DashboardPage(),
          settings: settings,
        );

      case AppRoutes.ktpCapture:
        return MaterialPageRoute(
          builder: (_) => const KtpCapturePage(),
          settings: settings,
        );

      case AppRoutes.ktpIntro:
        return MaterialPageRoute(
          builder: (_) => const KtpIntroPage(),
          settings: settings,
        );

      case AppRoutes.selfieIntro:
        return MaterialPageRoute(
          builder: (_) => const SelfieIntroPage(),
          settings: settings,
        );

      case AppRoutes.selfieWithKtp:
        return MaterialPageRoute(
          builder: (_) => const SelfieWithKtpPage(),
          settings: settings,
        );

      case AppRoutes.livenessIntro:
        return MaterialPageRoute(
          builder: (_) => const LivenessIntroPage(),
          settings: settings,
        );

      case AppRoutes.livenessGesture:
        return MaterialPageRoute(
          builder: (_) => const LivenessGesturePage(),
          settings: settings,
        );

      case AppRoutes.ekycComplete:
        return MaterialPageRoute(
          builder: (_) => const EKycCompletePage(),
          settings: settings,
        );

      case AppRoutes.chat:
        return MaterialPageRoute(
          builder: (_) => const ChatPage(),
          settings: settings,
        );

      default:
        return MaterialPageRoute(
          builder: (_) => const SplashPage(),
          settings: settings,
        );
    }
  }
}
