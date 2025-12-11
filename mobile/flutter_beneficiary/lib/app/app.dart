import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../core/constants/routes.dart';
import '../features/auth/presentation/bloc/auth_event.dart';
import '../features/auth/presentation/bloc/auth_bloc.dart';
import 'router.dart';

class EKYCApp extends StatelessWidget {
  const EKYCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (_) => AuthBloc()..add(AuthCheckRequested()),
        ),
      ],
      child: MaterialApp(
        title: 'e-KYC Beneficiary',
        debugShowCheckedModeBanner: false,
        initialRoute: AppRoutes.splash,
        onGenerateRoute: AppRouter.onGenerateRoute,
        theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.blue),
      ),
    );
  }
}
