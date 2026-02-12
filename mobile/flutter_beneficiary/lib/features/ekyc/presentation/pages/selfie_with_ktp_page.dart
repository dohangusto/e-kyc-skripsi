import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../ekyc_progress_store.dart';
import '../bloc/face_matching/face_matching_bloc.dart';
import '../bloc/face_matching/face_matching_event.dart';
import '../bloc/face_matching/face_matching_state.dart';
import '../widgets/camera_preview_widget.dart';

class SelfieWithKtpPage extends StatefulWidget {
  const SelfieWithKtpPage({super.key});

  @override
  State<SelfieWithKtpPage> createState() => _SelfieWithKtpPageState();
}

class _SelfieWithKtpPageState extends State<SelfieWithKtpPage> {
  @override
  void initState() {
    super.initState();
    if (EkycProgressStore.statusOf('selfie') != EkycStepStatus.done) {
      EkycProgressStore.setStatus('selfie', EkycStepStatus.inProgress);
    }
    context.read<FaceMatchingBloc>().add(const FaceMatchingStarted());
  }

  void _goNext() {
    final state = context.read<FaceMatchingBloc>().state;
    Navigator.of(
      context,
    ).pushReplacementNamed(AppRoutes.selfiePreview, arguments: state.photoPath);
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        EkycProgressStore.setStatus('selfie', EkycStepStatus.pending);
        return true;
      },
      child: BlocListener<FaceMatchingBloc, FaceMatchingState>(
        listener: (context, state) {
          if (state is FaceMatchingUploaded) {
            _goNext();
          }
        },
        child: Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: const Text('Ambil Selfi KTP'),
            centerTitle: false,
            leading: IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                EkycProgressStore.setStatus('selfie', EkycStepStatus.pending);
                Navigator.of(context).maybePop();
              },
            ),
            actions: const [
              Padding(
                padding: EdgeInsets.only(right: Dimens.spacing12),
                child: Icon(Icons.help_outline),
              ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(Dimens.spacing16),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 520),
                        child: BlocBuilder<FaceMatchingBloc, FaceMatchingState>(
                          builder: (context, state) {
                            return Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const CameraPreviewWidget(
                                  label: 'Arahkan wajah dan KTP ke kamera',
                                  initialDirection: CameraLensDirection.front,
                                ),
                                if (state is FaceMatchingUploadError) ...[
                                  const SizedBox(height: Dimens.spacing12),
                                  Container(
                                    padding: const EdgeInsets.all(
                                      Dimens.spacing12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.danger.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(
                                        Dimens.borderRadius12,
                                      ),
                                    ),
                                    child: Text(
                                      state.message,
                                      style: const TextStyle(
                                        color: AppColors.danger,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),
                BlocBuilder<FaceMatchingBloc, FaceMatchingState>(
                  builder: (context, state) {
                    final isUploading = state is FaceMatchingUploading;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: Dimens.spacing24),
                      child: GestureDetector(
                        onTap: isUploading
                            ? null
                            : () {
                                context.read<FaceMatchingBloc>().add(
                                  const FaceMatchingTakeSelfie(),
                                );
                              },
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.black12, width: 2),
                            boxShadow: const [
                              BoxShadow(
                                color: Colors.black26,
                                blurRadius: 10,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: isUploading
                              ? const Center(
                                  child: SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.4,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        AppColors.primary,
                                      ),
                                    ),
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
