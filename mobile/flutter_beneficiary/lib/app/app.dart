import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../core/constants/colors.dart';
import '../core/constants/routes.dart';
import '../features/auth/presentation/bloc/auth_bloc.dart';
import '../features/auth/presentation/bloc/auth_event.dart';
import '../features/chat/presentation/bloc/chat_bloc.dart';
import '../features/dashboard/presentation/bloc/dashboard_bloc.dart';
import '../features/ekyc/presentation/bloc/face_matching/face_matching_bloc.dart';
import '../features/ekyc/presentation/bloc/ktp_capture/ktp_capture_bloc.dart';
import '../features/ekyc/presentation/bloc/liveness/liveness_bloc.dart';
import 'router.dart';

class EKYCApp extends StatelessWidget {
  const EKYCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (_) => AuthBloc()..add(const AuthCheckRequested()),
        ),
        BlocProvider<KtpCaptureBloc>(create: (_) => KtpCaptureBloc()),
        BlocProvider<FaceMatchingBloc>(create: (_) => FaceMatchingBloc()),
        BlocProvider<LivenessBloc>(create: (_) => LivenessBloc()),
        BlocProvider<DashboardBloc>(create: (_) => DashboardBloc()),
        BlocProvider<ChatBloc>(create: (_) => ChatBloc()),
      ],
      child: MaterialApp(
        title: 'e-KYC Beneficiary',
        debugShowCheckedModeBanner: false,
        initialRoute: AppRoutes.splash,
        onGenerateRoute: AppRouter.onGenerateRoute,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
          scaffoldBackgroundColor: AppColors.background,
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.surface,
            elevation: 0,
            foregroundColor: AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}
