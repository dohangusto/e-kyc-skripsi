import '../../presentation/bloc/dashboard_state.dart';

StepStatus _mapStatus(String? value) {
  switch (value?.toLowerCase()) {
    case 'done':
    case 'completed':
      return StepStatus.done;
    case 'in_progress':
    case 'inprogress':
    case 'ongoing':
      return StepStatus.inProgress;
    default:
      return StepStatus.pending;
  }
}

class AssistanceInfoModel extends AssistanceInfo {
  const AssistanceInfoModel({
    required super.title,
    required super.category,
    super.group,
    required super.amount,
    required super.description,
    super.deliveryMethod,
  });

  factory AssistanceInfoModel.fromJson(Map<String, dynamic> json) {
    return AssistanceInfoModel(
      title: (json['title'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      group: (json['group'] as String?),
      amount: (json['amount'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      deliveryMethod:
          (json['delivery_method'] ?? json['deliveryMethod']) as String?,
    );
  }
}

class ScheduleInfoModel extends ScheduleInfo {
  const ScheduleInfoModel({
    required super.date,
    required super.location,
    required super.time,
    required super.note,
  });

  factory ScheduleInfoModel.fromJson(Map<String, dynamic> json) {
    return ScheduleInfoModel(
      date: (json['date'] ?? '').toString(),
      location: (json['location'] ?? '').toString(),
      time: (json['time'] ?? '').toString(),
      note: (json['note'] ?? '').toString(),
    );
  }
}

class TimelineStepModel extends TimelineStep {
  const TimelineStepModel({
    required super.title,
    required super.subtitle,
    required super.status,
  });

  factory TimelineStepModel.fromJson(Map<String, dynamic> json) {
    return TimelineStepModel(
      title: (json['title'] ?? '').toString(),
      subtitle: (json['subtitle'] ?? '').toString(),
      status: _mapStatus(json['status'] as String?),
    );
  }
}

class DashboardData {
  final AssistanceInfo assistanceInfo;
  final ScheduleInfo? nextSchedule;
  final List<TimelineStep> verificationSteps;
  final List<TimelineStep> aidProgressSteps;
  final String faceMatchingStatus;

  const DashboardData({
    required this.assistanceInfo,
    required this.verificationSteps,
    required this.aidProgressSteps,
    required this.faceMatchingStatus,
    this.nextSchedule,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final verification =
        (json['verification_steps'] ?? json['verificationSteps'] ?? const [])
            as List<dynamic>;
    final aidProgress =
        (json['aid_progress_steps'] ?? json['aidProgressSteps'] ?? const [])
            as List<dynamic>;

    return DashboardData(
      assistanceInfo: AssistanceInfoModel.fromJson(
        (json['assistance'] ?? json['assistance_info'] ?? <String, dynamic>{})
            as Map<String, dynamic>,
      ),
      nextSchedule:
          json['next_schedule'] == null &&
              json['schedule'] == null &&
              json['nextSchedule'] == null
          ? null
          : ScheduleInfoModel.fromJson(
              (json['next_schedule'] ??
                      json['schedule'] ??
                      json['nextSchedule'] ??
                      <String, dynamic>{})
                  as Map<String, dynamic>,
            ),
      verificationSteps: verification
          .whereType<Map<String, dynamic>>()
          .map(TimelineStepModel.fromJson)
          .toList(),
      aidProgressSteps: aidProgress
          .whereType<Map<String, dynamic>>()
          .map(TimelineStepModel.fromJson)
          .toList(),
      faceMatchingStatus:
          (json['face_matching_status'] ?? json['faceMatchingStatus'] ?? '')
              .toString()
              .trim(),
    );
  }
}
